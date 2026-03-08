import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, Gift, PartyPopper, Sparkles } from "lucide-react";

interface RewardItem {
  amount: number;
  desc: string;
}

interface WalletRewardPopupProps {
  open: boolean;
  onClose: () => void;
  rewards: RewardItem[];
  totalAmount: number;
}

const WalletRewardPopup = ({ open, onClose, rewards, totalAmount }: WalletRewardPopupProps) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 rounded-2xl">
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 px-6 pt-8 pb-10 text-center overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/10 blur-sm" />
          <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10 blur-sm" />
          <div className="absolute top-2 right-8 w-8 h-8 rounded-full bg-yellow-300/30 animate-pulse" />
          <div className="absolute bottom-4 left-6 w-6 h-6 rounded-full bg-yellow-300/20 animate-pulse delay-200" />

          {/* Icon */}
          <div className="relative mx-auto mb-3 w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <PartyPopper className="h-8 w-8 text-white drop-shadow" />
          </div>

          <h2 className="text-white text-xl font-bold tracking-tight drop-shadow">
            🎉 Congratulations!
          </h2>
          <p className="text-white/80 text-sm mt-1">You earned wallet rewards</p>

          {/* Big amount */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
            <span className="text-4xl font-extrabold text-white drop-shadow-lg">
              ₹{totalAmount}
            </span>
            <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
          </div>
          <p className="text-white/70 text-xs mt-1">credited to your wallet</p>
        </div>

        {/* Reward breakdown */}
        <div className="px-6 py-5 space-y-3">
          {rewards.map((reward, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-800/40"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-sm">
                <Gift className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{reward.desc}</p>
              </div>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                +₹{reward.amount}
              </span>
            </div>
          ))}

          {/* Wallet balance hint */}
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />
            <span>Use wallet balance on your next order!</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <Button
            onClick={onClose}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all"
          >
            Awesome! 🎊
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletRewardPopup;
