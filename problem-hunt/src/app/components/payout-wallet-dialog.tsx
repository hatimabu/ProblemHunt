import { ShieldCheck, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { LinkWallet } from "./LinkWallet";

interface PayoutWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletCount: number;
  onWalletsChange?: (count: number) => void;
}

export function PayoutWalletDialog({
  open,
  onOpenChange,
  walletCount,
  onWalletsChange,
}: PayoutWalletDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-5xl overflow-hidden border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-0 text-[var(--board-ink)]">
        <DialogHeader className="sr-only">
          <DialogTitle>Manage payout wallets</DialogTitle>
          <DialogDescription>
            Add, remove, and choose the primary payout wallet for each supported chain.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[94vh] overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-[color:var(--board-line)] bg-[linear-gradient(180deg,rgba(14,226,255,0.08),transparent_52%),linear-gradient(135deg,rgba(242,139,148,0.12),transparent_62%),var(--board-panel)] p-5 lg:border-b-0 lg:border-r">
            <div className="board-brand-mark h-12 w-12">
              <Wallet className="h-6 w-6 text-[var(--board-ink)]" />
            </div>
            <p className="board-kicker mt-4">Payout Control</p>
            <div className="mt-2 space-y-0">
              <h2 className="font-display text-[1.9rem] font-semibold tracking-[-0.05em] text-[var(--board-ink)]">
                Manage payout wallets
              </h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--board-muted)]">
              Add or rotate addresses per chain, keep one primary payout route, and make sure accepted work has a current wallet behind it.
            </p>

            <div className="mt-4 rounded-2xl border border-[color:var(--board-line)] bg-[rgba(11,18,32,0.38)] p-4">
              <p className="board-eyebrow">Linked now</p>
              <p className="mt-3 font-display text-4xl font-semibold tracking-[-0.06em] text-[var(--board-ink)]">
                {walletCount}
              </p>
              <p className="mt-2 text-sm text-[var(--board-muted)]">
                Wallet{walletCount === 1 ? "" : "s"} currently connected across supported chains.
              </p>
            </div>

            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[color:rgba(14,226,255,0.22)] bg-[rgba(14,226,255,0.08)] p-3 text-sm text-[var(--board-muted)]">
              <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[var(--board-cyan)]" />
              <p>Setting a new primary wallet updates the payout path used by the marketplace for that chain.</p>
            </div>
          </aside>

          <div className="max-h-[94vh] overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:p-5">
            <LinkWallet onWalletsChange={onWalletsChange} compactTop />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
