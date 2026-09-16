package android.webkit;
public abstract class PermissionRequest { public static final String RESOURCE_AUDIO_CAPTURE="audio";
 public abstract android.net.Uri getOrigin(); public abstract String[] getResources();
 public abstract void grant(String[] r); public abstract void deny(); }
