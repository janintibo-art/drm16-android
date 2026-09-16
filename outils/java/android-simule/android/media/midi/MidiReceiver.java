package android.media.midi;
public abstract class MidiReceiver {
 public abstract void onSend(byte[] m,int o,int c,long t) throws java.io.IOException;
 public void send(byte[] m,int o,int c) throws java.io.IOException {} }
