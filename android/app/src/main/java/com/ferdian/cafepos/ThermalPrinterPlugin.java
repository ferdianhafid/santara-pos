package com.ferdian.cafepos;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.os.Build;
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
import java.util.List;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "ThermalPrinter",
    permissions = {
        @Permission(strings = { Manifest.permission.BLUETOOTH_CONNECT }, alias = "connect")
    }
)
public class ThermalPrinterPlugin extends Plugin {

    private static final UUID SERIAL_PORT_PROFILE_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final int MAX_PRINT_BYTES = 256 * 1024;
    private static final int WRITE_CHUNK_BYTES = 1024;

    @PluginMethod
    public void getStatus(PluginCall call) {
        BluetoothAdapter adapter = getBluetoothAdapter();
        JSObject result = new JSObject();
        result.put("supported", adapter != null);
        result.put("enabled", isBluetoothEnabled(adapter));
        result.put("permission", hasConnectPermission() ? "granted" : "prompt");
        call.resolve(result);
    }

    @PluginMethod
    public void requestBluetoothPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || hasConnectPermission()) {
            resolvePermission(call);
            return;
        }

        requestPermissionForAlias("connect", call, "bluetoothPermissionCallback");
    }

    @PermissionCallback
    private void bluetoothPermissionCallback(PluginCall call) {
        resolvePermission(call);
    }

    @PluginMethod
    public void listPairedDevices(PluginCall call) {
        if (!ensureBluetoothReady(call)) {
            return;
        }

        try {
            BluetoothAdapter adapter = getBluetoothAdapter();
            Set<BluetoothDevice> bondedDevices = adapter.getBondedDevices();
            List<BluetoothDevice> sortedDevices = new ArrayList<>(bondedDevices);
            sortedDevices.sort(
                Comparator.comparing(
                    device -> safeDeviceName(device).toLowerCase(),
                    Comparator.naturalOrder()
                )
            );

            JSArray devices = new JSArray();
            for (BluetoothDevice device : sortedDevices) {
                JSObject item = new JSObject();
                item.put("name", safeDeviceName(device));
                item.put("address", device.getAddress());
                item.put("type", mapDeviceType(device.getType()));
                devices.put(item);
            }

            JSObject result = new JSObject();
            result.put("devices", devices);
            call.resolve(result);
        } catch (SecurityException error) {
            call.reject("Izin Nearby Devices diperlukan untuk membaca printer yang sudah dipasangkan.", "BLUETOOTH_PERMISSION_REQUIRED", error);
        }
    }

    @PluginMethod
    public void print(PluginCall call) {
        if (!ensureBluetoothReady(call)) {
            return;
        }

        String address = call.getString("address", "").trim().toUpperCase();
        String dataBase64 = call.getString("dataBase64", "");

        if (!BluetoothAdapter.checkBluetoothAddress(address)) {
            call.reject("Alamat Bluetooth printer tidak valid.", "INVALID_PRINTER_ADDRESS");
            return;
        }

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

    private void printInBackground(PluginCall call, String address, byte[] printBytes) {
        BluetoothSocket socket = null;
        OutputStream output = null;

        try {
            BluetoothAdapter adapter = getBluetoothAdapter();
            BluetoothDevice device = adapter.getRemoteDevice(address);
            if (device.getBondState() != BluetoothDevice.BOND_BONDED) {
                call.reject("Printer belum dipasangkan di pengaturan Bluetooth Android.", "PRINTER_NOT_PAIRED");
                return;
            }

            socket = device.createRfcommSocketToServiceRecord(SERIAL_PORT_PROFILE_UUID);
            try {
                socket.connect();
            } catch (IOException secureConnectionError) {
                closeQuietly(socket);
                socket = device.createInsecureRfcommSocketToServiceRecord(SERIAL_PORT_PROFILE_UUID);
                socket.connect();
            }
            output = socket.getOutputStream();

            for (int offset = 0; offset < printBytes.length; offset += WRITE_CHUNK_BYTES) {
                int length = Math.min(WRITE_CHUNK_BYTES, printBytes.length - offset);
                output.write(printBytes, offset, length);
                output.flush();
            }

            JSObject result = new JSObject();
            result.put("printed", true);
            result.put("bytesWritten", printBytes.length);
            call.resolve(result);
        } catch (SecurityException error) {
            call.reject("Izin Nearby Devices diperlukan untuk mencetak.", "BLUETOOTH_PERMISSION_REQUIRED", error);
        } catch (IOException error) {
            call.reject("Tidak dapat terhubung atau mengirim data ke printer.", "PRINTER_CONNECTION_FAILED", error);
        } finally {
            closeQuietly(output);
            closeQuietly(socket);
        }
    }

    private boolean ensureBluetoothReady(PluginCall call) {
        BluetoothAdapter adapter = getBluetoothAdapter();
        if (adapter == null) {
            call.reject("Perangkat Android ini tidak mendukung Bluetooth.", "BLUETOOTH_UNSUPPORTED");
            return false;
        }

        if (!hasConnectPermission()) {
            call.reject("Izin Nearby Devices belum diberikan.", "BLUETOOTH_PERMISSION_REQUIRED");
            return false;
        }

        if (!adapter.isEnabled()) {
            call.reject("Bluetooth Android belum aktif.", "BLUETOOTH_DISABLED");
            return false;
        }

        return true;
    }

    private BluetoothAdapter getBluetoothAdapter() {
        BluetoothManager manager = (BluetoothManager) getContext().getSystemService(android.content.Context.BLUETOOTH_SERVICE);
        return manager == null ? null : manager.getAdapter();
    }

    private boolean hasConnectPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || getPermissionState("connect") == PermissionState.GRANTED;
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
        result.put("permission", hasConnectPermission() ? "granted" : "denied");
        call.resolve(result);
    }

    private static String safeDeviceName(BluetoothDevice device) {
        String name = device.getName();
        return name == null || name.trim().isEmpty() ? "Bluetooth Printer" : name.trim();
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
}
