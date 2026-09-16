package fr.tibo.drm16;
public class TestMidi {
  static int fautes=0;
  static void ok(boolean c,String m){ System.out.println((c?"  ok   ":"  FAUX ")+m); if(!c) fautes++; }
  static int ancien(int statut){ statut&=0xFF;
    if (statut >= 0xF8 || statut == 0xF4 || statut == 0xF5 || statut == 0xF6 || statut == 0xF7 || statut == 0xF0) return 1;
    if (statut == 0xF1 || statut == 0xF3) return 2; if (statut == 0xF2) return 3;
    if (statut >= 0x80 && statut <= 0xEF){ int t=statut&0xF0; return (t==0xC0||t==0xD0)?2:3; } return -1; }
  static byte[] b(int... v){ byte[] o=new byte[v.length]; for(int i=0;i<v.length;i++) o[i]=(byte)v[i]; return o; }
  public static void main(String[] a){
    StringBuilder diff=new StringBuilder();
    for(int s=0;s<256;s++) if(ancien(s)!=MidiOctets.longueur(s)) diff.append(String.format("%02X:%d>%d ",s,ancien(s),MidiOctets.longueur(s)));
    System.out.println("statuts changes : "+diff);
    ok(diff.toString().trim().equals("F0:1>-1 F4:1>-1 F5:1>-1 F7:1>-1 F9:1>-1 FD:1>-1"), "seuls F0 F4 F5 F7 F9 FD changent, tous refuses");
    ok(MidiOctets.longueur(0x90)==3 && MidiOctets.longueur(0xC5)==2 && MidiOctets.longueur(0xF8)==1, "note, programme, horloge inchanges");
    ok(MidiOctets.sysexComplet(b(0xF0,0x42,0x30,0x57,0x1C,0xF7)), "demande ES-1 complete");
    ok(MidiOctets.sysexComplet(b(0xF0,0x42,0x01,0xF7, 0xF0,0x42,0x02,0xF7)), "deux messages a la suite");
    ok(!MidiOctets.sysexComplet(b(0xF0)), "F0 seul refuse");
    ok(!MidiOctets.sysexComplet(b(0xF0,0x42,0x30)), "sans F7 refuse");
    ok(!MidiOctets.sysexComplet(b(0xF0,0xF7)), "vide refuse");
    ok(!MidiOctets.sysexComplet(b(0xF0,0x42,0x90,0xF7)), "statut au milieu refuse");
    ok(!MidiOctets.sysexComplet(b(0x42,0xF0,0x01,0xF7)), "ne commence pas par F0 refuse");
    ok(!MidiOctets.sysexComplet(b(0xF0,0x01,0xF7,0x00)), "octet apres le dernier F7 refuse");
    ok(!MidiOctets.sysexComplet(b(0xF0,0x01,0xF7,0xF0,0x02)), "second message tronque refuse");
    ok(!MidiOctets.sysexComplet(null) && !MidiOctets.sysexComplet(new byte[0]), "rien refuse");
    System.out.println(fautes==0?"TOUT EST BON":fautes+" FAUTE(S)"); System.exit(fautes);
  }
}
