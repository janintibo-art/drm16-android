package android.media.midi;
public class MidiDeviceInfo {
 public static final String PROPERTY_NAME="name", PROPERTY_PRODUCT="product", PROPERTY_MANUFACTURER="manufacturer";
 public static final int TYPE_USB=1, TYPE_VIRTUAL=2, TYPE_BLUETOOTH=3;
 public static final class PortInfo { public static final int TYPE_INPUT=1, TYPE_OUTPUT=2;
  /* Donnees injectees par reflexion dans TestMidiOuverture, pas une API Android supplementaire. */
  private int typeSimule, numeroSimule;
  public int getType(){return typeSimule;} public int getPortNumber(){return numeroSimule;} public String getName(){return "";} }
 public PortInfo[] getPorts(){return null;} public android.os.Bundle getProperties(){return null;}
 public int getId(){return 0;} public int getType(){return 0;}
 public int getInputPortCount(){return 0;} public int getOutputPortCount(){return 0;} }
