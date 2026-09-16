package android.media.midi;
public class MidiManager {
 public interface OnDeviceOpenedListener { void onDeviceOpened(MidiDevice d); }
 public static class DeviceCallback { public void onDeviceAdded(MidiDeviceInfo d){} public void onDeviceRemoved(MidiDeviceInfo d){} }
 public MidiDeviceInfo[] getDevices(){return null;}
 public void openDevice(MidiDeviceInfo i, OnDeviceOpenedListener l, android.os.Handler h){}
 public void registerDeviceCallback(DeviceCallback c, android.os.Handler h){}
 public void unregisterDeviceCallback(DeviceCallback c){} }
