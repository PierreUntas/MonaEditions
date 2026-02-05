import { NextRequest, NextResponse } from "next/server";

const IPFS_RPC = process.env.IPFS_RPC;

export async function POST(request: NextRequest) {
    // Uploading to IPFS RPC (internal). IPFS_RPC may be undefined.

    if (!IPFS_RPC) {
        console.error("❌ IPFS_RPC not configured");
        return NextResponse.json(
            {
                error: "Configuration manquante: IPFS_RPC non défini côté serveur.",
                details: "Définir IPFS_RPC dans .env.local (dev) ou les variables d'environnement de production.",
            },
            { status: 500 }
        );
    }

    try {
        const formData = await request.formData();
        const fileEntry = formData.get("file");
        if (!fileEntry || !(fileEntry instanceof File)) {
            return NextResponse.json(
                { error: "Aucun fichier reçu dans le champ `file`." },
                { status: 400 }
            );
        }

        const file = fileEntry as File;
        // Received file (internal): name, size -> file.name, file.size

        // Prepare the FormData to forward to the IPFS RPC
        const forward = new FormData();
        forward.append("file", file, file.name);

        const url = `${IPFS_RPC.replace(/\/$/, "")}/api/v0/add?pin=false`;
        const res = await fetch(url, {
            method: "POST",
            body: forward,
        });

        const text = await res.text();
        if (!res.ok) {
            console.error("IPFS RPC response error:", res.status, text);
            return NextResponse.json(
                { error: "Erreur depuis le RPC IPFS", details: text },
                { status: 502 }
            );
        }

        const lines = text.trim().split("\n").filter(Boolean);
        const last = JSON.parse(lines[lines.length - 1]);

        const cid = last.Hash ?? last?.cid?.["/"] ?? last.cid;
        const size = last.Size ? Number(last.Size) : file.size;

        // IPFS add result (internal): last

        return NextResponse.json({
            Hash: cid,
            cid,
            size,
            name: file.name,
        });
    } catch (error: any) {
        console.error("💥 IPFS RPC upload error:", error);
        return NextResponse.json(
            {
                error: "Échec de l'upload vers le RPC IPFS",
                details: error?.message || String(error),
            },
            { status: 500 }
        );
    }
}
