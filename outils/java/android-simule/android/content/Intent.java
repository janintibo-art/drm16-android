package android.content;
public class Intent {
 public static final int FLAG_ACTIVITY_CLEAR_TOP=1, FLAG_ACTIVITY_NEW_TASK=2, FLAG_ACTIVITY_SINGLE_TOP=4;
 public static final String ACTION_GET_CONTENT="g", CATEGORY_OPENABLE="o", EXTRA_ALLOW_MULTIPLE="m";
 public Intent(){} public Intent(String a){} public Intent(Context c, Class<?> k){}
 public Intent addFlags(int f){return this;} public Intent setFlags(int f){return this;}
 public Intent setAction(String a){return this;} public String getAction(){return null;}
 public Intent putExtra(String k, boolean v){return this;} public Intent putExtra(String k, String v){return this;}
 public Intent addCategory(String c){return this;} public Intent setType(String t){return this;}
 public boolean getBooleanExtra(String k, boolean d){return d;}
}
