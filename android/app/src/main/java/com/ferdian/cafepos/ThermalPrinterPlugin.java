package com.ferdian.cafepos;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "ThermalPrinter",
    permissions = {
        @Permission(strings = { Manifest.permission.BLUETOOTH_CONNECT }, alias = "connect"),
        @Permission(strings = { Manifest.permission.BLUETOOTH_SCAN }, alias = "scan"),
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION }, alias = "location")
    }
)
public class ThermalPrinterPlugin extends Plugin {

    private static final UUID SERIAL_PORT_PROFILE_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final int DISCOVERY_TIMEOUT_MS = 15_000;
    private static final int PAIRING_TIMEOUT_MS = 60_000;
    private static final int MAX_PRINT_BYTES = 256 * 1024;
    private static final int WRITE_CHUNK_BYTES = 1024;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Object connectionLock = new Object();
    private final Map<String, BluetoothDevice> discoveredDevices = new LinkedHashMap<>();

    private BluetoothSocket connectedSocket;
    private OutputStream connectedOutput;
    private String connectedAddress;

    private PluginCall pendingDiscoveryCall;
    private boolean discoveryReceiverRegistered;
    private final Runnable discoveryTimeout = () -> finishDiscovery(false);

    private PluginCall pendingPairCall;
    private String pendingPairAddress;
    private boolean pairingStarted;
    private boolean bondReceiverRegistered;
    private final Runnable pairingTimeout = () -> finishPairing(false, "Waktu pairing habis. Pastikan printer menyala dan coba lagi.");

    private final BroadcastReceiver discoveryReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                BluetoothDevice device = getBluetoothDeviceExtra(intent);
                if (device != null) {
                    discoveredDevices.put(device.getAddress(), device);
                }
            } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                BluetoothAdapter adapter = getBluetoothAdapter();
                // Abaikan broadcast selesai milik scan lama jika scan baru sudah aktif.
                if (pendingDiscoveryCall != null && (adapter == null || !adapter.isDiscovering())) {
                    finishDiscovery(true);
                }
            }
        }
    };

    private final BroadcastReceiver bondReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (!BluetoothDevice.ACTION_BOND_STATE_CHANGED.equals(intent.getAction())) {
                return;
            }

            BluetoothDevice device = getBluetoothDeviceExtra(intent);
            if (device == null || pendingPairAddress == null || !pendingPairAddress.equals(device.getAddress())) {
                return;
            }

            int bondState = intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.ERROR);
            int previousState = intent.getIntExtra(BluetoothDevice.EXTRA_PREVIOUS_BOND_STATE, BluetoothDevice.ERROR);
            if (bondState == BluetoothDevice.BOND_BONDING) {
                pairingStarted = true;
            } else if (bondState == BluetoothDevice.BOND_BONDED) {
                finishPairing(true, null);
            } else if (bondState == BluetoothDevice.BOND_NONE && (pairingStarted || previousState == BluetoothDevice.BOND_BONDING)) {
                finishPairing(false, "Pairing dibatalkan atau PIN ditolak. Coba PIN printer, biasanya 0000 atau 1234.");
            }
        }
    };

    @PluginMethod
    public void getStatus(PluginCall call) {
        BluetoothAdapter adapter = getBluetoothAdapter();
        JSObject result = new JSObject();
        result.put("supported", adapter != null);
        result.put("enabled", isBluetoothEnabled(adapter));
        result.put("permission", hasBluetoothPermissions() ? "granted" : "prompt");
        putConnectionStatus(result);
        call.resolve(result);
    }

    @PluginMethod
    public void requestBluetoothPermission(PluginCall call) {
        if (hasBluetoothPermissions()) {
            resolvePermission(call);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            requestPermissionForAliases(new String[] { "connect", "scan" }, call, "bluetoothPermissionCallback");
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            requestPermissionForAlias("location", call, "bluetoothPermissionCallback");
        } else {
            resolvePermission(call);
        }
    }

    @PermissionCallback
    private void bluetoothPermissionCallback(PluginCall call) {
        resolvePermission(call);
    }

    @PluginMethod
    public void listPairedDevices(PluginCall call) {
        if (!ensureBluetoothReady(call, false)) {
            return;
        }

        try {
            JSObject result = new JSObject();
            result.put("devices", buildPairedDeviceArray());
            call.resolve(result);
        } catch (SecurityException error) {
            rejectPermission(call, "membaca printer yang sudah dipasangkan", error);
        }
    }

    @PluginMethod
    public void discoverDevices(PluginCall call) {
        if (!ensureBluetoothReady(call, true)) {
            return;
        }
        if (pendingDiscoveryCall != null) {
            call.reject("Pencarian perangkat masih berlangsung.", "DISCOVERY_IN_PROGRESS");
            return;
        }

        try {
            BluetoothAdapter adapter = getBluetoothAdapter();
            discoveredDevices.clear();
            Set<BluetoothDevice> bondedDevices = adapter.getBondedDevices();
            for (BluetoothDevice device : bondedDevices) {
                discoveredDevices.put(device.getAddress(), device);
            }

            ensureDiscoveryReceiverRegistered();
            if (adapter.isDiscovering()) {
                adapter.cancelDiscovery();
            }

            pendingDiscoveryCall = call;
            if (!adapter.startDiscovery()) {
                pendingDiscoveryCall = null;
                call.reject("Android tidak dapat memulai pencarian Bluetooth.", "DISCOVERY_START_FAILED");
                return;
            }

            mainHandler.postDelayed(discoveryTimeout, DISCOVERY_TIMEOUT_MS);
        } catch (SecurityException error) {
            pendingDiscoveryCall = null;
            rejectPermission(call, "mencari printer di sekitar", error);
        }
    }

    @PluginMethod
    public void pairDevice(PluginCall call) {
        if (!ensureBluetoothReady(call, false)) {
            return;
        }
        String address = normalizedAddress(call);
        if (address == null) {
            return;
        }
        if (pendingPairCall != null) {
            call.reject("Proses pairing perangkat lain masih berlangsung.", "PAIRING_IN_PROGRESS");
            return;
        }

        try {
            BluetoothDevice device = getBluetoothAdapter().getRemoteDevice(address);
            if (device.getBondState() == BluetoothDevice.BOND_BONDED) {
                call.resolve(deviceResult(device, true));
                return;
            }

            ensureBondReceiverRegistered();
            pendingPairCall = call;
            pendingPairAddress = address;
            pairingStarted = false;
            if (!device.createBond()) {
                clearPendingPair();
                call.reject("Android tidak dapat memulai pairing printer.", "PAIRING_START_FAILED");
                return;
            }

            mainHandler.postDelayed(pairingTimeout, PAIRING_TIMEOUT_MS);
        } catch (SecurityException error) {
            clearPendingPair();
            rejectPermission(call, "memasangkan printer", error);
        } catch (IllegalArgumentException error) {
            clearPendingPair();
            call.reject("Alamat Bluetooth printer tidak valid.", "INVALID_PRINTER_ADDRESS", error);
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (!ensureBluetoothReady(call, false)) {
            return;
        }
        String address = normalizedAddress(call);
        if (address == null) {
            return;
        }
        execute(() -> connectInBackground(call, address));
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        execute(() -> {
            closeConnection();
            JSObject result = new JSObject();
            result.put("connected", false);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void getConnectionStatus(PluginCall call) {
        JSObject result = new JSObject();
        putConnectionStatus(result);
        call.resolve(result);
    }

    @PluginMethod
    public void print(PluginCall call) {
        if (!ensureBluetoothReady(call, false)) {
            return;
        }

        String address = normalizedAddress(call);
        if (address == null) {
            return;
        }
        String dataBase64 = call.getString("dataBase64", "");

        byte[] printBytes;
        try {
            printBytes = Base64.decode(dataBase64, Base64.DEFAULT);
        } catch (IllegalArgumentException error) {
            call.reject("Data struk tidak valid.", "INVALID_PRINT_DATA", error);
            return;
        }

        if (printBytes.length == 0 || printBytes.length > MAX_PRINT_BYTES) {
            call.reject("Ukuran data struk tidak valid.", "INVALID_PRINT_DATA_SIZE");
            return;
        }

        execute(() -> printInBackground(call, address, printBytes));
    }

    private void connectInBackground(PluginCall call, String address) {
        try {
            BluetoothAdapter adapter = getBluetoothAdapter();
            BluetoothDevice device = adapter.getRemoteDevice(address);
            if (device.getBondState() != BluetoothDevice.BOND_BONDED) {
                call.reject("Printer belum dipasangkan. Tekan Pasangkan & Hubungkan terlebih dahulu.", "PRINTER_NOT_PAIRED");
                return;
            }

            synchronized (connectionLock) {
                if (address.equals(connectedAddress) && connectionIsOpenLocked()) {
                    call.resolve(deviceResult(device, true));
                    return;
                }
            }

            if (adapter.isDiscovering()) {
                adapter.cancelDiscovery();
            }
            closeConnection();

            BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SERIAL_PORT_PROFILE_UUID);
            try {
                socket.connect();
            } catch (IOException secureConnectionError) {
                closeQuietly(socket);
                socket = device.createInsecureRfcommSocketToServiceRecord(SERIAL_PORT_PROFILE_UUID);
                socket.connect();
            }
            OutputStream output = socket.getOutputStream();

            synchronized (connectionLock) {
                connectedSocket = socket;
                connectedOutput = output;
                connectedAddress = address;
            }
            call.resolve(deviceResult(device, true));
        } catch (SecurityException error) {
            closeConnection();
            rejectPermission(call, "menghubungkan printer", error);
        } catch (IOException error) {
            closeConnection();
            call.reject("Koneksi printer gagal. Pastikan printer menyala, sudah dipasangkan, dan tidak terhubung ke HP lain.", "PRINTER_CONNECTION_FAILED", error);
        }
    }

    private void printInBackground(PluginCall call, String address, byte[] printBytes) {
        try {
            synchronized (connectionLock) {
                if (!address.equals(connectedAddress) || !connectionIsOpenLocked() || connectedOutput == null) {
                    call.reject("Printer belum terhubung. Hubungkan printer dari Settings sebelum mencetak.", "PRINTER_NOT_CONNECTED");
                    return;
                }

                for (int offset = 0; offset < printBytes.length; offset += WRITE_CHUNK_BYTES) {
                    int length = Math.min(WRITE_CHUNK_BYTES, printBytes.length - offset);
                    connectedOutput.write(printBytes, offset, length);
                }
                connectedOutput.flush();
            }

            // Beri buffer printer waktu untuk menerima byte sebelum UI menyatakan transmisi selesai.
            SystemClock.sleep(350);
            JSObject result = new JSObject();
            result.put("printed", true);
            result.put("bytesWritten", printBytes.length);
            result.put("connected", true);
            call.resolve(result);
        } catch (IOException error) {
            closeConnection();
            call.reject("Koneksi terputus saat mengirim data. Hubungkan ulang printer lalu coba lagi.", "PRINTER_WRITE_FAILED", error);
        }
    }

    private void finishDiscovery(boolean completedNormally) {
        mainHandler.removeCallbacks(discoveryTimeout);
        PluginCall call = pendingDiscoveryCall;
        pendingDiscoveryCall = null;
        if (call == null) {
            return;
        }

        try {
            BluetoothAdapter adapter = getBluetoothAdapter();
            if (adapter != null && adapter.isDiscovering()) {
                adapter.cancelDiscovery();
            }
            JSObject result = new JSObject();
            result.put("devices", buildDiscoveredDeviceArray());
            result.put("completed", completedNormally);
            call.resolve(result);
        } catch (SecurityException error) {
            rejectPermission(call, "menyelesaikan pencarian printer", error);
        }
    }

    private void finishPairing(boolean paired, String errorMessage) {
        mainHandler.removeCallbacks(pairingTimeout);
        PluginCall call = pendingPairCall;
        String address = pendingPairAddress;
        clearPendingPair();
        if (call == null) {
            return;
        }

        if (!paired) {
            call.reject(errorMessage, "PAIRING_FAILED");
            return;
        }

        try {
            BluetoothDevice device = getBluetoothAdapter().getRemoteDevice(address);
            call.resolve(deviceResult(device, true));
        } catch (SecurityException error) {
            rejectPermission(call, "memastikan hasil pairing", error);
        }
    }

    private void clearPendingPair() {
        pendingPairCall = null;
        pendingPairAddress = null;
        pairingStarted = false;
    }

    private JSArray buildPairedDeviceArray() {
        Set<BluetoothDevice> bondedDevices = getBluetoothAdapter().getBondedDevices();
        return buildDeviceArray(new ArrayList<>(bondedDevices));
    }

    private JSArray buildDiscoveredDeviceArray() {
        return buildDeviceArray(new ArrayList<>(discoveredDevices.values()));
    }

    private JSArray buildDeviceArray(List<BluetoothDevice> devices) {
        devices.sort(Comparator.comparing(device -> safeDeviceName(device).toLowerCase(), Comparator.naturalOrder()));
        JSArray result = new JSArray();
        for (BluetoothDevice device : devices) {
            result.put(deviceResult(device, device.getBondState() == BluetoothDevice.BOND_BONDED));
        }
        return result;
    }

    private JSObject deviceResult(BluetoothDevice device, boolean paired) {
        JSObject item = new JSObject();
        item.put("name", safeDeviceName(device));
        item.put("address", device.getAddress());
        item.put("type", mapDeviceType(device.getType()));
        item.put("paired", paired);
        return item;
    }

    private void putConnectionStatus(JSObject result) {
        synchronized (connectionLock) {
            boolean connected = connectionIsOpenLocked();
            result.put("connected", connected);
            result.put("connectedAddress", connected ? connectedAddress : null);
        }
    }

    private boolean connectionIsOpenLocked() {
        return connectedSocket != null && connectedSocket.isConnected();
    }

    private void closeConnection() {
        synchronized (connectionLock) {
            closeQuietly(connectedOutput);
            closeQuietly(connectedSocket);
            connectedOutput = null;
            connectedSocket = null;
            connectedAddress = null;
        }
    }

    private boolean ensureBluetoothReady(PluginCall call, boolean requireScanPermission) {
        BluetoothAdapter adapter = getBluetoothAdapter();
        if (adapter == null) {
            call.reject("Perangkat Android ini tidak mendukung Bluetooth.", "BLUETOOTH_UNSUPPORTED");
            return false;
        }
        if (!hasConnectPermission() || (requireScanPermission && !hasScanPermission())) {
            call.reject("Izin Perangkat di Sekitar diperlukan untuk Bluetooth printer.", "BLUETOOTH_PERMISSION_REQUIRED");
            return false;
        }
        if (!adapter.isEnabled()) {
            call.reject("Bluetooth Android belum aktif.", "BLUETOOTH_DISABLED");
            return false;
        }
        return true;
    }

    private BluetoothAdapter getBluetoothAdapter() {
        BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return manager == null ? null : manager.getAdapter();
    }

    private boolean hasBluetoothPermissions() {
        return hasConnectPermission() && hasScanPermission();
    }

    private boolean hasConnectPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || getPermissionState("connect") == PermissionState.GRANTED;
    }

    private boolean hasScanPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return getPermissionState("scan") == PermissionState.GRANTED;
        }
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || getPermissionState("location") == PermissionState.GRANTED;
    }

    private boolean isBluetoothEnabled(BluetoothAdapter adapter) {
        if (adapter == null || !hasConnectPermission()) {
            return false;
        }
        try {
            return adapter.isEnabled();
        } catch (SecurityException ignored) {
            return false;
        }
    }

    private void resolvePermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("permission", hasBluetoothPermissions() ? "granted" : "denied");
        call.resolve(result);
    }

    private String normalizedAddress(PluginCall call) {
        String address = call.getString("address", "").trim().toUpperCase();
        if (!BluetoothAdapter.checkBluetoothAddress(address)) {
            call.reject("Alamat Bluetooth printer tidak valid.", "INVALID_PRINTER_ADDRESS");
            return null;
        }
        return address;
    }

    private void ensureDiscoveryReceiverRegistered() {
        if (discoveryReceiverRegistered) {
            return;
        }
        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothDevice.ACTION_FOUND);
        filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        registerReceiver(discoveryReceiver, filter);
        discoveryReceiverRegistered = true;
    }

    private void ensureBondReceiverRegistered() {
        if (bondReceiverRegistered) {
            return;
        }
        IntentFilter filter = new IntentFilter(BluetoothDevice.ACTION_BOND_STATE_CHANGED);
        registerReceiver(bondReceiver, filter);
        bondReceiverRegistered = true;
    }

    private void registerReceiver(BroadcastReceiver receiver, IntentFilter filter) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Broadcast Bluetooth berasal dari aplikasi sistem berprivilege dengan UID berbeda.
            getContext().registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            getContext().registerReceiver(receiver, filter);
        }
    }

    @SuppressWarnings("deprecation")
    private static BluetoothDevice getBluetoothDeviceExtra(Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice.class);
        }
        return intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
    }

    private void rejectPermission(PluginCall call, String action, SecurityException error) {
        call.reject("Izin Perangkat di Sekitar diperlukan untuk " + action + ".", "BLUETOOTH_PERMISSION_REQUIRED", error);
    }

    private static String safeDeviceName(BluetoothDevice device) {
        String name = device.getName();
        return name == null || name.trim().isEmpty() ? "Perangkat Bluetooth" : name.trim();
    }

    private static String mapDeviceType(int type) {
        if (type == BluetoothDevice.DEVICE_TYPE_CLASSIC) {
            return "classic";
        }
        if (type == BluetoothDevice.DEVICE_TYPE_LE) {
            return "le";
        }
        if (type == BluetoothDevice.DEVICE_TYPE_DUAL) {
            return "dual";
        }
        return "unknown";
    }

    private static void closeQuietly(OutputStream output) {
        if (output == null) {
            return;
        }
        try {
            output.close();
        } catch (IOException ignored) {}
    }

    private static void closeQuietly(BluetoothSocket socket) {
        if (socket == null) {
            return;
        }
        try {
            socket.close();
        } catch (IOException ignored) {}
    }

    @Override
    protected void handleOnDestroy() {
        mainHandler.removeCallbacks(discoveryTimeout);
        mainHandler.removeCallbacks(pairingTimeout);
        BluetoothAdapter adapter = getBluetoothAdapter();
        try {
            if (adapter != null && hasScanPermission() && adapter.isDiscovering()) {
                adapter.cancelDiscovery();
            }
        } catch (SecurityException ignored) {}
        if (discoveryReceiverRegistered) {
            getContext().unregisterReceiver(discoveryReceiver);
            discoveryReceiverRegistered = false;
        }
        if (bondReceiverRegistered) {
            getContext().unregisterReceiver(bondReceiver);
            bondReceiverRegistered = false;
        }
        closeConnection();
        super.handleOnDestroy();
    }
}
