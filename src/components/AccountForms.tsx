"use client";

import { useActionState, useRef, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { addAddress, deleteAddress, updateProfile, type FormState } from "@/app/account/actions";

const field = "w-full rounded-xl border border-[#09492e]/20 bg-white px-4 py-3 text-base sm:text-sm outline-none focus:border-[#09492e] focus:ring-2 focus:ring-[#09492e]/15";
const btn = "rounded-full bg-[#09492e] px-6 py-3 text-sm font-semibold text-[#fbf8f3] hover:bg-[#06321f] disabled:opacity-60 cursor-pointer";

function Msg({ s }: { s: FormState }) {
  if (s?.error) return <p role="alert" className="text-xs text-[#b81d56]">{s.error}</p>;
  if (s?.ok) return <p role="status" className="text-xs font-semibold text-[#09492e]">Saved ✓</p>;
  return null;
}

export function ProfileForm({ name, phone }: { name: string; phone: string | null }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input name="name" required defaultValue={name} aria-label="Full name" className={field} />
      <input name="phone" inputMode="numeric" maxLength={10} defaultValue={phone ?? ""} placeholder="Mobile" aria-label="Mobile" className={field} />
      <div className="flex items-center gap-4 sm:col-span-2"><button disabled={pending} className={btn}>{pending ? "Saving…" : "Save profile"}</button><Msg s={state} /></div>
    </form>
  );
}

export function AddAddressForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (p: FormState, fd: FormData) => {
    const r = await addAddress(p, fd);
    if (r?.ok) ref.current?.reset();
    return r;
  }, undefined);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      <input name="fullName" required placeholder="Full name" className={field} />
      <input name="phone" required inputMode="numeric" maxLength={10} placeholder="Mobile" className={field} />
      <input name="line1" required placeholder="Address" className={`${field} sm:col-span-2`} />
      <input name="line2" placeholder="Landmark (optional)" className={`${field} sm:col-span-2`} />
      <input name="city" required placeholder="City" className={field} />
      <input name="pincode" required inputMode="numeric" maxLength={6} placeholder="PIN code" className={field} />
      <input name="state" required placeholder="State" className={`${field} sm:col-span-2`} />
      <div className="flex items-center gap-4 sm:col-span-2"><button disabled={pending} className={btn}>{pending ? "Adding…" : "Add address"}</button><Msg s={state} /></div>
    </form>
  );
}

export function DeleteAddressButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} aria-label="Delete address" onClick={() => start(() => deleteAddress(id))} className="rounded-full p-2 text-[#09492e]/50 hover:text-[#b81d56] disabled:opacity-40 cursor-pointer">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
