"use client";

import { useState } from "react";
import JSZip from "jszip";
import { PDFDocument, degrees } from "pdf-lib";

type Mode =
  | "pdf-images"
  | "images-pdf"
  | "merge"
  | "split"
  | "rotate";

const modes = [
  { id: "pdf-images", label: "PDF to images", hint: "Convert PDF pages to images" },
  { id: "images-pdf", label: "Images to PDF", hint: "Combine images into PDF" },
  { id: "merge", label: "Merge PDFs", hint: "Combine multiple PDFs" },
  { id: "split", label: "Split PDF", hint: "Extract pages from PDF" },
  { id: "rotate", label: "Rotate PDF", hint: "Rotate PDF pages" },
] as const;

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function Toolkit() {
  const [mode, setMode] = useState<Mode>("pdf-images");
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState("png");
  const [quality, setQuality] = useState(0.92);
  const [range, setRange] = useState("");
  const [rotation, setRotation] = useState(90);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const accept = mode === "images-pdf" ? "image/*" : "application/pdf";

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(e.target.files || []));
    setMessage("");
  }

  async function run() {
    if (!files.length) return;

    setBusy(true);
    setMessage("Processing...");

    try {
      // ---------------- PDF → Images ----------------
      if (mode === "pdf-images") {
        const pdfjs = await import("pdfjs-dist");

        pdfjs.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

        const doc = await pdfjs
          .getDocument({ data: await files[0].arrayBuffer() })
          .promise;

        const zip = new JSZip();

        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          const view = page.getViewport({ scale: 2 });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;

          canvas.width = view.width;
          canvas.height = view.height;

          await page.render({ canvasContext: ctx, viewport: view }).promise;

          const mime =
            format === "jpg" ? "image/jpeg" : `image/${format}`;

          const blob = await new Promise<Blob>((resolve) =>
            canvas.toBlob((b) => resolve(b!), mime, quality)
          );

          zip.file(`page-${n}.${format}`, blob);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        download(zipBlob, "pdf-images.zip");
      }

      // ---------------- Images → PDF ----------------
      if (mode === "images-pdf") {
        const out = await PDFDocument.create();

        for (const f of files) {
          const bytes = await f.arrayBuffer();

          let img;
          if (f.type === "image/png") img = await out.embedPng(bytes);
          else img = await out.embedJpg(bytes);

          const page = out.addPage([img.width, img.height]);
          page.drawImage(img, {
            x: 0,
            y: 0,
            width: img.width,
            height: img.height,
          });
        }

const pdfBytes = await out.save() as unknown as Uint8Array;
        download(
          new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" }),
          "images.pdf"
        );
      }

      // ---------------- Merge PDFs ---------------- //
      //
      //
      if (mode === "merge") {
        const out = await PDFDocument.create();

        for (const f of files) {
          const src = await PDFDocument.load(await f.arrayBuffer());
          const pages = await out.copyPages(src, src.getPageIndices());
          pages.forEach((p) => out.addPage(p));
        }

const pdfBytes = await out.save() as unknown as Uint8Array;
        download(
          new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" }),
          "merged.pdf"
        );
      }

      // ---------------- Split / Rotate ----------------
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
            p.setRotation(
              degrees((p.getRotation().angle + rotation) % 360)
            );
          }
          out.addPage(p);
        });

const pdfBytes = await out.save() as unknown as Uint8Array;
        download(
          new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" }),
          mode === "split" ? "split.pdf" : "rotated.pdf"
        );
      }

      setMessage("Done. Download started.");
    } catch (e) {
      console.error(e);
      setMessage("Error processing file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="tools">
        {modes.map((m) => (
          <button
            key={m.id}
            className={mode === m.id ? "active" : ""}
            onClick={() => {
              setMode(m.id as Mode);
              setFiles([]);
              setMessage("");
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="card">
        <h1>{modes.find((x) => x.id === mode)?.label}</h1>
        <p>{modes.find((x) => x.id === mode)?.hint}</p>

        <input
          type="file"
          multiple={mode === "images-pdf" || mode === "merge"}
          accept={accept}
          onChange={pick}
        />

        <button disabled={!files.length || busy} onClick={run}>
          {busy ? "Processing..." : "Convert"}
        </button>

        {message && <p>{message}</p>}
      </div>
    </section>
  );
}