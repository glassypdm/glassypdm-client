import { useState } from "react"
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { z } from "zod";
import { Label } from "../ui/label";
import { useSignIn } from "@clerk/clerk-react";
import { isClerkAPIResponseError } from "@clerk/clerk-react/errors";
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
            setEmailError("Invalid email.")
            setLoadingInit(false);
            return;
        }
        setEmailError("");
        if (!isLoaded) {
            setLoadingInit(false);
            return;
        }

        try {
            await signIn.create({
                strategy: "reset_password_email_code",
                identifier: email
            }).then(_ => {
                setResetState(true);
            });
        } catch(err) {
            setEmailError("An error occurred; check your email is correct and you are connected to the Internet.")
            console.error(err)
        }
        setLoadingInit(false);
    }

    async function resetPassword() {
        setLoadingReset(true);
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

        if(!isLoaded) {
            setLoadingReset(false);
            return;
        }

        try {
            const res = await signIn.attemptFirstFactor({
                strategy: 'reset_password_email_code',
                code: resetCode,
                password: proposedPass
            })
            if(res.status === 'complete') {
                await setActive({ session: signIn.createdSessionId });
            }
            else {
                setPassError("An error occured; try again.")
                setLoadingReset(false);
                return;                    
            }
        } catch(err: any) {
            console.error(JSON.stringify(err, null, 2));
            if(isClerkAPIResponseError(err)) {
                if(err.errors[0].code !== "form_code_incorrect")
                    setPassError(err.errors[0].message);
                else
                    setPassError("Reset code is incorrect.");
            }
            else {
                setPassError("An error occured; try again.")
            }
            setLoadingReset(false);
            return;        
        }
        // TODO are we missing something?
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
        <Label className="text-red-500">{passError}</Label>
        <Button variant={"destructive"} onClick={resetPassword} disabled={loadingReset}>{loadingReset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />: "Reset Password"}</Button>
    </div>
    }
    </DialogContent>    
  )
}

export default ForgotPassword