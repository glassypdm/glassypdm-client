import { useState } from "react"
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { z } from "zod";
import { Label } from "../ui/label";
import { useSignIn } from "@clerk/clerk-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { Loader2 } from "lucide-react";

function ForgotPassword() {
    const { isLoaded, signIn, setActive } = useSignIn();
    const [resetState, setResetState] = useState(false);
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passError, setPassError] = useState("");
    const [resetCode, setResetCode] = useState("");
    const [proposedPass, setProposedPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [loadingInit, setLoadingInit] = useState(false);
    const [loadingReset, setLoadingReset] = useState(false);

    async function initResetFlow() {
        const emailSchema = z.string().email();
        const validation = emailSchema.safeParse(email);
        setLoadingInit(true);

        if (!validation.success) {
            // TODO display error
            setEmailError("Invalid email.")
            setLoadingInit(false);
            return;
        }
        setEmailError("");
        if (!isLoaded) {
            setLoadingInit(false);
            return;
        }

        const res = await signIn.create({
            strategy: "reset_password_email_code",
            identifier: email
        }).then(_ => {
            setResetState(true);
        });
        setLoadingInit(false);
    }

    async function resetPassword() {
        setLoadingReset(true);
        // TODO verify password are equal
        if (proposedPass !== confirmPass) {
            setPassError("Passwords do not match.");
            setLoadingReset(false);
            return;
        }
        else if (resetCode.length < 6) {
            setPassError("Reset code is incomplete.");
            setLoadingReset(false);
            return;
        }

        // TODO attemptfirstfactor

        // TODO check status

        // TODO how to show success?
        setPassError("");
        setLoadingReset(false);
    }

  return (
    <DialogContent className="flex flex-col">
        <DialogHeader>
            <DialogTitle>Forgot Password?</DialogTitle>
            <DialogDescription>Follow the steps to reset your password.</DialogDescription>
        </DialogHeader>
    {
    !resetState ?
    <div className="space-y-2 flex flex-col">
        <Label htmlFor="email">Email</Label>
        <Input placeholder="Email" type="email" onChange={(e: any) => setEmail(e.target.value)} />
        <Label className="text-red-500">{emailError}</Label>
        <Button onClick={initResetFlow} disabled={loadingInit}>{loadingInit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />: "Send Reset Code"}</Button>
    </div>
    :
    <div className="space-y-2 flex flex-col">
        <Label>New Password</Label>
        <Input placeholder="New Password" type="password" onChange={(e: any) => setProposedPass(e.target.value)} />
        <Label>Confirm Password</Label>
        <Input placeholder="Confirm Password" type="password" onChange={(e: any) => setConfirmPass(e.target.value)} />
        <Label className="text-red-500">{passError}</Label>
        <Label className="flex flex-row space-x-16"><p>Password Reset Code</p><p className="text-muted-foreground">Check your email!</p></Label>
        <InputOTP maxLength={6} onChange={(value) => setResetCode(value)}>
            <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
            </InputOTPGroup>
        </InputOTP>
        <Button variant={"destructive"} onClick={resetPassword}>Reset Password</Button>
    </div>
    }
    </DialogContent>    
  )
}

export default ForgotPassword