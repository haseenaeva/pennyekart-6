import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

interface Props {
  loginPath: string;
  title: string;
}

const ForgotPassword = ({ loginPath, title }: Props) => {
  const [mobile, setMobile] = useState("");
  const [dob, setDob] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const { toast } = useToast();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile)) {
      toast({ title: "Enter a valid 10-digit mobile number", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("reset-password", {
      body: { action: "verify", mobile_number: mobile, date_of_birth: dob },
    });

    if (error || !data?.verified) {
      toast({ title: "Verification failed", description: data?.message || "Mobile number and date of birth don't match.", variant: "destructive" });
    } else {
      setVerified(true);
      toast({ title: "Verified!", description: "Enter your new password." });
    }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("reset-password", {
      body: { action: "reset", mobile_number: mobile, date_of_birth: dob, new_password: newPassword },
    });

    if (error || !data?.success) {
      toast({ title: "Reset failed", description: data?.message || "Could not reset password.", variant: "destructive" });
    } else {
      toast({ title: "Password reset successful!", description: "You can now login with your new password." });
      setVerified(false);
      setMobile("");
      setDob("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logo} alt="Pennyekart" className="mx-auto mb-4 h-12" />
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{verified ? "Enter your new password" : "Verify your identity"}</CardDescription>
        </CardHeader>
        <CardContent>
          {!verified ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input id="mobile" type="tel" placeholder="10-digit number" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} required />
              </div>
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify"}
              </Button>
              <p className="text-center text-sm"><Link to={loginPath} className="text-primary underline">Back to Login</Link></p>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
