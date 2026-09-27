(function(){
  'use strict';
  const assets=Object.freeze({
    mynta:'MyntaBlad_garnering.png',
    lime:'Lime_garnering.png',
    ananas:'ananasskiva_stor.png',
    korsbar:'Coktailkorsbar.png'
  });
  const drinks=Object.freeze({
    mojito:Object.freeze(['mynta','lime']),
    maiTai:Object.freeze(['ananas','mynta']),
    pinaColada:Object.freeze(['ananas','korsbar']),
    jungleBird:Object.freeze(['ananas']),
    ibaTiki:Object.freeze(['lime','ananas'])
  });
  function filesFor(drinkId){
    return (drinks[String(drinkId||'')]||[]).map(id=>({id,file:assets[id]}));
  }
  window.__barTikiGarnish398={assets,drinks,filesFor};
})();