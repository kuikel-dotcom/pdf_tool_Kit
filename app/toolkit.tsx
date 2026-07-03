 "use client";
import {useState} from "react";
import JSZip from "jszip";
import {PDFDocument,degrees} from "pdf-lib";

type Mode="pdf-images"|"images-pdf"|"merge"|"split"|"rotate";
const modes:{id:Mode;label:string;hint:string}[]=[
{id:"pdf-images",label:"PDF to images",hint:"Convert every PDF page to PNG, JPG, or WebP"},
{id:"images-pdf",label:"Images to PDF",hint:"Combine images into one PDF"},
{id:"merge",label:"Merge PDFs",hint:"Combine multiple PDF files"},
{id:"split",label:"Split PDF",hint:"Export selected pages as a new PDF"},
{id:"rotate",label:"Rotate PDF",hint:"Rotate every page and download"}
];
function download(blob:Blob,name:string){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
export default function Toolkit(){
 const [mode,setMode]=useState<Mode>("pdf-images"),[files,setFiles]=useState<File[]>([]),[format,setFormat]=useState("png"),[quality,setQuality]=useState(.92),[range,setRange]=useState(""),[rotation,setRotation]=useState(90),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const accept=mode==="images-pdf"?"image/*":"application/pdf";
 function pick(e:React.ChangeEvent<HTMLInputElement>){setFiles(Array.from(e.target.files||[]));setMessage("")}
 async function run(){
  if(!files.length)return; setBusy(true);setMessage("Processing locally on your device…");
  try{
   if (mode === "images-pdf") {
  const out = await PDFDocument.create();

  for (const f of files) {
    const bytes = await f.arrayBuffer();
    let img;

    if (f.type === "image/png") img = await out.embedPng(bytes);
    else img = await out.embedJpg(bytes);

    const p = out.addPage([img.width, img.height]);
    p.drawImage(img, {
      x: 0,
      y: 0,
      width: img.width,
      height: img.height,
    });
  }

  const pdfBytes = await out.save();

  download(
    new Blob([new Uint8Array(pdfBytes)], {
      type: "application/pdf",
    }),
    "images.pdf"
  );
}

if (mode === "merge") {
  const out = await PDFDocument.create();

  for (const f of files) {
    const src = await PDFDocument.load(await f.arrayBuffer());
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }

  const pdfBytes2 = await out.save();

  download(
    new Blob([new Uint8Array(pdfBytes2)], {
      type: "application/pdf",
    }),
    "merged.pdf"
  );
}

if (mode === "images-pdf") {
  const out = await PDFDocument.create();

  for (const f of files) {
    const bytes = await f.arrayBuffer();
    let img;

    if (f.type === "image/png") img = await out.embedPng(bytes);
    else img = await out.embedJpg(bytes);

    const p = out.addPage([img.width, img.height]);
    p.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }

  const pdfBytes = await out.save();
  download(
    new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }),
    "images.pdf"
  );
}

if (mode === "merge") {
  const out = await PDFDocument.create();

  for (const f of files) {
    const src = await PDFDocument.load(await f.arrayBuffer());
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }

  const pdfBytes = await out.save();
  download(
    new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }),
    "merged.pdf"
  );
}

if (mode === "split" || mode === "rotate") {
  const src = await PDFDocument.load(await files[0].arrayBuffer());
  const out = await PDFDocument.create();

  let indexes = src.getPageIndices();

  if (mode === "split" && range) {
    indexes = range
      .split(",")
      .flatMap((x) => {
        const [a, b] = x.trim().split("-").map(Number);
        return b
          ? Array.from({ length: b - a + 1 }, (_, i) => a - 1 + i)
          : [a - 1];
      })
      .filter((i) => i >= 0 && i < src.getPageCount());
  }

  const pages = await out.copyPages(src, indexes);

  pages.forEach((p) => {
    if (mode === "rotate") {
      p.setRotation(degrees((p.getRotation().angle + rotation) % 360));
    }
    out.addPage(p);
  });

  const pdfBytes = await out.save();
  download(
    new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }),
    mode === "split" ? "split.pdf" : "rotated.pdf"
  );
}
   if(mode==="pdf-images"){const pdfjs=await import("pdfjs-dist");pdfjs.GlobalWorkerOptions.workerSrc=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;const doc=await pdfjs.getDocument({data:await files[0].arrayBuffer()}).promise;const zip=new JSZip();for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n),view=page.getViewport({scale:2}),canvas=document.createElement("canvas"),ctx=canvas.getContext("2d")!;canvas.width=view.width;canvas.height=view.height;await page.render({canvasContext:ctx,viewport:view}).promise;const mime=format==="jpg"?"image/jpeg":`image/${format}`;const blob=await new Promise<Blob>(r=>canvas.toBlob(b=>r(b!),mime,quality));zip.file(`page-${n}.${format}`,blob)}download(await zip.generateAsync({type:"blob"}),"pdf-images.zip")}
   setMessage("Done. Your download should begin now.");
  }catch(e){setMessage("Could not process this file. Try a smaller, non-password-protected file or a supported format.");console.error(e)}finally{setBusy(false)}
 }
 return <section><div className="tools">{modes.map(m=><button className={mode===m.id?"active":""} onClick={()=>{setMode(m.id);setFiles([]);setMessage("")}} key={m.id}>{m.label}</button>)}</div><div className="card"><h1>{modes.find(x=>x.id===mode)?.label}</h1><p>{modes.find(x=>x.id===mode)?.hint}</p><label className="drop"><input type="file" accept={accept} multiple={mode==="images-pdf"||mode==="merge"} onChange={pick}/><strong>Choose files or drop them here</strong><small>{mode==="images-pdf"?"PNG or JPG images":"PDF files"}</small></label>{files.length>0&&<p className="selected">{files.map(f=>f.name).join(", ")}</p>}
 {mode==="pdf-images"&&<div className="options"><label>Format <select value={format} onChange={e=>setFormat(e.target.value)}><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WebP</option></select></label><label>Quality <input type="range" min=".5" max="1" step=".05" value={quality} onChange={e=>setQuality(+e.target.value)}/></label></div>}
 {mode==="split"&&<label>Pages (example: 1-3, 6) <input value={range} onChange={e=>setRange(e.target.value)} placeholder="Leave empty for all pages"/></label>}
 {mode==="rotate"&&<label>Rotation <select value={rotation} onChange={e=>setRotation(+e.target.value)}><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">270° clockwise</option></select></label>}
 <button className="convert" disabled={!files.length||busy} onClick={run}>{busy?"Working…":"Convert and download"}</button>{message&&<p className="message">{message}</p>}</div><p className="privacy">Files are processed in your browser. They are not uploaded by this app.</p></section>
}