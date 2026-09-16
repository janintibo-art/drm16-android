package android.app;
import android.content.*;
public class Notification {
 public static final int CATEGORY_TRANSPORT_I=0; public static final String CATEGORY_TRANSPORT="transport";
 public static class Builder {
  public Builder(Context c){} public Builder(Context c, String ch){}
  public Builder setContentTitle(CharSequence s){return this;} public Builder setContentText(CharSequence s){return this;}
  public Builder setSmallIcon(int i){return this;} public Builder setOngoing(boolean b){return this;}
  public Builder setContentIntent(PendingIntent p){return this;} public Builder setCategory(String c){return this;}
  public Builder setOnlyAlertOnce(boolean b){return this;} public Builder setShowWhen(boolean b){return this;}
  public Builder setPriority(int p){return this;} public Builder setVisibility(int v){return this;}
  public Builder setSilent(boolean b){return this;}
  public Notification build(){return new Notification();}
 }
 public static final int PRIORITY_LOW=-1, VISIBILITY_PUBLIC=1;
}
