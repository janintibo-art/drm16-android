/* ================= rythmes =================
   X fort · x normal · o fantôme · . silence  (16 doubles-croches) */
var BANQUE_A = [
 [ /* FUNK */
  {sw:0,   bd:"X..x..X.....X...", sd:"....X.......X...", hh:"xoxoxoxoxoxoxoxo", cy:"X...............", wb:"......x.........", sp:"..............x."},
  {sw:0,   bd:"X...X..x..X.....", sd:"....X....o..X..x", hh:"x.x.x.xox.x.x.x.", oh:"......x.......x.", cy:"X..............."},
  {sw:.12, bd:"X.....X...X.....", sd:"....o.......o...", cp:"....X.......X...", hh:"xxoxxoxxoxxoxxox", wb:"..x.......x....."},
  {sw:0,   bd:"X..x..X...X...x.", sd:"..o.X..o..o.X.o.", hh:"xoxoxoxoxoxoxoxo", cy:"X...............", sp:".......x........"}
 ],
 [ /* DISCO */
  {sw:0,   bd:"X...X...X...X...", sd:"....X.......X...", hh:"x.x.x.x.x.x.x.x.", oh:"..x...x...x...x.", cy:"X..............."},
  {sw:0,   bd:"X...X...X...X...", sd:"....X.......X...", cp:"....X.......X...", hh:"xxxxxxxxxxxxxxxx", oh:"..x...x...x...x."},
  {sw:0,   bd:"X...X...X...X...", sd:"....X.......X...", rd:"x.x.x.x.x.x.x.x.", cp:"....X.......X...", wb:"..........x....."},
  {sw:0,   bd:"X...X...X..xX...", sd:"....X.......X..o", hh:"x.xxx.xxx.xxx.xx", oh:"......x.......x.", sp:"..............x."}
 ],
 [ /* ROCK : HARD BOOGIE SOFT SLOW */
  {sw:0,   bd:"X.....X.X.....X.", sd:"....X.......X...", hh:"x.x.x.x.x.x.x.x.", cy:"X..............."},
  {sw:.62, bd:"X.....X.....X...", sd:"....X.......X...", hh:"x..x..x..x..x..x", cy:"X..............."},
  {sw:0,   bd:"X.......X.......", sd:"....o.......o...", hh:"o.o.o.o.o.o.o.o.", wb:"............x..."},
  {sw:0,   bd:"X.......x.......", sd:"........X.......", rd:"x...x...x...x...", cy:"X..............."}
 ],
 [ /* MISC : LATIN REGGAE CNTRY SHUFFLE / SWING */
  {sw:0,   bd:"X.....X...X.....", wb:"x..x..x...x.x...", hh:"xoxoxoxoxoxoxoxo", cp:"............x...", sp:"......x........."},
  {sw:.08, bd:"........X.......", sd:"........X.......", hh:"x.o.x.o.x.o.x.o.", wb:"....x.......x...", sp:"..............x."},
  {sw:0,   bd:"X.......X.......", sd:"....X.......X...", hh:"xoxoxoxoxoxoxoxo", wb:"..............x."},
  {sw:.64, bd:"X.....X.....X...", sd:"....X.......X...", hh:"x..x..x..x..x..x", rd:"x..x..x..x..x..x"}
 ]
];

/* seconde sélection, propre à la DRM32 */
var BANQUE_B = [
 [ /* FUNK */
  {sw:0,   bd:"X..x..X...x.X..x", sd:"....X.......X...", hh:"xoxoxoxoxoxoxoxo", cp:"....X.......X...", sp:"..............x."},
  {sw:0,   bd:"X...X..x..X...x.", sd:"..o.X..o..o.X..o", hh:"x.x.x.xox.x.x.x.", oh:"......x.......x.", wb:"..........x....."},
  {sw:.12, bd:"X.......X.....x.", sd:"........X.......", hh:"x.x.x.x.x.x.x.x.", wb:"..x...x...x...x.", sp:".......x........"},
  {sw:0,   bd:"X..x..X...X...x.", sd:"....X.......X..x", hh:"xxxxxxxxxxxxxxxx", rd:"x...x...x...x...", sp:"..........x....."}
 ],
 [ /* DISCO */
  {sw:0,   bd:"X...X...X...X...", cp:"....X.......X...", hh:"x.x.x.x.x.x.x.x.", oh:"..x...x...x...x.", sp:"..............x."},
  {sw:0,   bd:"X...X...X...X...", sd:"....X.......X...", rd:"x.x.x.x.x.x.x.x.", cp:"............x...", wb:"..x.......x....."},
  {sw:0,   bd:"X...X..xX...X..x", sd:"....X.......X...", hh:"xxxxxxxxxxxxxxxx", oh:"......x.......x.", cy:"X..............."},
  {sw:0,   bd:"X...X...X...X...", sd:"....X.......X...", hh:"x.xxx.xxx.xxx.xx", cp:"....X.......X...", sp:".......x........"}
 ],
 [ /* ROCK */
  {sw:0,   bd:"X.X...X.X.X...X.", sd:"....X.......X...", hh:"x.x.x.x.x.x.x.x.", cy:"X..............."},
  {sw:.62, bd:"X.....X..x..X...", sd:"....X.......X...", rd:"x..x..x..x..x..x", wb:"............x..."},
  {sw:0,   bd:"X.......X.......", sd:"....o.......X...", hh:"o.o.o.o.o.o.o.o.", wb:"......x........."},
  {sw:0,   bd:"X.......X......x", sd:"........X.......", rd:"x...x...x...x...", cy:"X...............", sp:"............x..."}
 ],
 [ /* MISC */
  {sw:0,   bd:"X.....X...X.....", wb:"..x.x...x..x..x.", hh:"xoxoxoxoxoxoxoxo", cp:"............x...", sp:"......x........."},
  {sw:.08, bd:"X...X...X...X...", sd:"........X.......", hh:"x.o.x.o.x.o.x.o.", wb:"....x.......x..."},
  {sw:0,   bd:"X.......X.......", sd:"..x.X..x..x.X..x", hh:"xxxxxxxxxxxxxxxx", cy:"X..............."},
  {sw:.64, bd:"X.....X.....X...", sd:"....o.......X...", rd:"x..xx.x..xx.x..x", wb:"......x........."}
 ]
];

