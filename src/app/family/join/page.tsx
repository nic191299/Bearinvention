"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createAuthClient } from "@/lib/auth";

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code") || "";
  const [status, setStatus] = useState<"loading" | "found" | "notfound" | "joined" | "error">("loading");
  const [groupName, setGroupName] = useState("");
  const [joining, setJoining] = useState(false);
  const supabase = createAuthClient();

  useEffect(() => {
    if (!code) { setStatus("notfound"); return; }
    supabase.from("family_groups").select("id, name").eq("invite_code", code).maybeSingle()
      .then(({ data }) => {
        if (data) { setGroupName(data.name || "Gruppo famiglia"); setStatus("found"); }
        else setStatus("notfound");
      });
  }, [code]);

  const handleJoin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/auth/login?next=/family/join?code=${code}`); return; }

    setJoining(true);
    const { data: group } = await supabase.from("family_groups").select("id").eq("invite_code", code).maybeSingle();
    if (!group) { setStatus("error"); setJoining(false); return; }

    await supabase.from("family_members").upsert(
      { group_id: group.id, user_id: user.id, display_name: user.user_metadata?.full_name || "Membro", avatar_color: "#3b82f6", sharing_enabled: true },
      { onConflict: "group_id,user_id" }
    );
    setStatus("joined");
    setJoining(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-800 to-indigo-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-4 animate-fade-in-up">
        {status === "loading" && (
          <div className="flex items-center justify-center py-8">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {status === "notfound" && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-red-500 text-[32px]">error</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Link non valido</h2>
            <p className="text-sm text-gray-500">Il codice di invito non è valido o è scaduto.</p>
            <Link href="/" className="block py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm">
              Vai all&apos;app
            </Link>
          </>
        )}

        {status === "found" && (
          <>
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-purple-600 text-[32px]">family_restroom</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Invito famiglia</h2>
            <p className="text-sm text-gray-500">
              Sei stato invitato a unirsi a <strong>{groupName}</strong> su Safez.<br />
              Potrai condividere la tua posizione in tempo reale con i tuoi cari.
            </p>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {joining ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Accetta invito
            </button>
            <Link href="/" className="block text-sm text-gray-400 hover:text-gray-600">
              Rifiuta
            </Link>
          </>
        )}

        {status === "joined" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-green-500 text-[32px]">check_circle</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Benvenuto in famiglia!</h2>
            <p className="text-sm text-gray-500">Ora puoi vedere la posizione dei tuoi cari sulla mappa.</p>
            <Link href="/" className="block py-3 bg-blue-600 text-white rounded-xl font-bold text-sm">
              Apri la mappa
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-red-500 text-[32px]">error</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Errore</h2>
            <Link href="/" className="block py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm">Torna all&apos;app</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function FamilyJoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
