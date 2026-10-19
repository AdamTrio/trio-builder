/* ================= v85 · WORLD ADD-ON · Knocked Loose =================
   Adam 10/18: the Spray Park skate bowls (outside kit `skate`, trio-kit-skate.js) belong to Knocked Loose — an add-on, not a kit
   everyone sees. Switched on (World → Add-ons → Knocked Loose), the map gets a "Knocked Loose" tab with the bowls:
   SKATE-C04 Bowl with tunnel (1 square) and SKATE-C11 Big bowl with tunnel (2 × 2). Both are sunken pieces (Spec v1.1):
   the world floor opens under them and you walk down the pool steps. More Knocked Loose pieces and props land here later. */
(function(){
  const CORE=window.HEXCORE; if(!CORE) return;
  CORE.WORLDADDONS=CORE.WORLDADDONS||{};
  CORE.WORLDADDONS.knockedloose={name:'Knocked Loose', kits:['skate'], kitName:'Knocked Loose', note:'The Spray Park skate bowls: a graffiti pool with a concrete loop, and a big 2 × 2 bowl. They dig into the ground; walk down the pool steps.'};
})();
