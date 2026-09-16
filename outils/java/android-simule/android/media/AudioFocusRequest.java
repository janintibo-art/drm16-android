package android.media;
public class AudioFocusRequest {
 public static class Builder { public Builder(int f){}
  public Builder setAudioAttributes(AudioAttributes a){return this;}
  public Builder setOnAudioFocusChangeListener(AudioManager.OnAudioFocusChangeListener l){return this;}
  public Builder setOnAudioFocusChangeListener(AudioManager.OnAudioFocusChangeListener l, android.os.Handler h){return this;}
  public Builder setWillPauseWhenDucked(boolean b){return this;}
  public Builder setAcceptsDelayedFocusGain(boolean b){return this;}
  public AudioFocusRequest build(){return new AudioFocusRequest();} } }
