import { kv } from "@vercel/kv";

const STAGES = {
  "1": { title:"Capitolo I · Il Nodo del Vento", passphrase:"VELA NERA",
    lat:41.918021, lon:12.567118, radiusMeters:10, arModel:"/pergamena.usdz", pdf:"/rotta-parte-1.pdf" },

  "2": { title:"Diario · Frammento I", passphrase:"SALE E RUM",
    lat:0, lon:0, radiusMeters:80, arModel:"/pergamena.usdz", pdf:"/rotta-parte-2.pdf" },

  "3": { title:"Capitolo II · L’Ossa del Porto", passphrase:"CARTA STREGATA",
    lat:0, lon:0, radiusMeters:80, arModel:"/pergamena.usdz", pdf:"/rotta-parte-3.pdf" },

  "4": { title:"Diario · Frammento II", passphrase:"NODO E PORTO",
    lat:0, lon:0, radiusMeters:80, arModel:"/pergamena.usdz", pdf:"/rotta-parte-4.pdf" },

  "5": { title:"Capitolo III · Il Dente del Sole", passphrase:"DENTE D'ORO",
    lat:0, lon:0, radiusMeters:80, arModel:"/pergamena.usdz", pdf:"/rotta-parte-5.pdf" },

  "6": { title:"Diario · Frammento III", passphrase:"POLVERE FREDDA",
    lat:0, lon:0, radiusMeters:80, arModel:"/pergamena.usdz", pdf:"/rotta-parte-6.pdf" },

  "7": { title:"Capitolo IV · La Scala di Giada", passphrase:"SCALA VERDE",
    lat:0, lon:0, radiusMeters:80, arModel:"/pergamena.usdz", pdf:"/rotta-parte-7.pdf" },

  "8": { title:"Diario · Frammento IV", passphrase:"QUADRATO NERO",
    lat:0, lon:0, radiusMeters:80, arModel:"/pergamena.usdz", pdf:"/rotta-parte-8.pdf" },

  "9": { title:"Capitolo V · Il Faro Storto", passphrase:"LUCE STORTA",
    lat:0, lon:0, radiusMeters:80, arModel:"/pergamena.usdz", pdf:"/rotta-parte-9.pdf" },

  "10": { title:"Diario · Frammento V", passphrase:"CHIAVE ABISSALE",
    lat:0, lon:0, radiusMeters:80, arModel:"/pergamena.usdz", pdf:"/rotta-parte-10.pdf" },
};

function norm(s){ return (s||"").toString().trim().toUpperCase(); }

export default async function handler(req, res){
  try{
    if(req.method!=="POST"){ res.status(405).json({ok:false,error:"METHOD_NOT_ALLOWED"}); return; }

    const { stageId, passphrase } = req.body || {};
    const id = String(stageId||"").trim();
    const stage = STAGES[id];
    if(!stage){ res.status(404).json({ok:false,error:"STAGE_NOT_FOUND"}); return; }

    const cookieHeader = req.headers.cookie || "";
    const playerId = cookieHeader.match(/playerId=([^;]+)/)?.[1];
    if(!playerId){ res.status(401).json({ok:false,error:"NO_PLAYER"}); return; }

    if(norm(passphrase)!==norm(stage.passphrase)){
      res.status(200).json({ok:false,error:"WRONG_PASSPHRASE"}); return;
    }

    const key = `progress:${norm(playerId)}`;
    const progress = await kv.get(key);
    if(!progress){ res.status(404).json({ok:false,error:"PLAYER_NOT_FOUND"}); return; }

    progress.unlocked[id] = {
      at: new Date().toISOString(),
      stageId: id,
      title: stage.title,
      pdf: stage.pdf,
      arModel: stage.arModel,
      lat: stage.lat,
      lon: stage.lon,
      radiusMeters: stage.radiusMeters
    };
    progress.lastStage = id;

    await kv.set(key, progress);

    res.status(200).json({ ok:true, stage:{ stageId:id, ...stage } });
  }catch(e){
    res.status(500).json({ok:false,error:e?.message||String(e)});
  }
}
