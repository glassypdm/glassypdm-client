import { Button } from '@/components/ui/button'
import { Form, FormControl, FormItem, FormLabel, FormField, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator'
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form';
import { z } from "zod";
import { SignedIn, SignedOut, useSignIn } from "@clerk/clerk-react";
import { useState } from 'react';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import ForgotPassword from '@/components/auth/forgot';
import { invoke } from '@tauri-apps/api/core';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/_app/signin')({
    component: SignIn,

    loader: async () => {
        const name: string = await invoke("get_server_name");
        console.log("hehe")
        console.log(name);
        return {name};
    }
})

const signInSchema = z.object({
    email: z.string().email( { message: "Invalid email." }),
    password: z.string().min(6, { message: "Password too short." })
})

function SignIn() {
    const { isLoaded, signIn, setActive } = useSignIn();
    const navigate = useNavigate();
    const [forgotState, setForgotState] = useState(false);
    const data = Route.useLoaderData();
    const [loading, setLoading] = useState(false)

    const signInForm = useForm<z.infer<typeof signInSchema>>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: "",
            password: ""
        }
    })
    async function onSigninSubmit(values: z.infer<typeof signInSchema>) {
        setLoading(true)
        if (!isLoaded) {
            return; // clerk hasn't loaded yet
        }

        try {
            const completeSignin = await signIn.create({
                identifier: values.email,
                strategy: "password",
                password: values.password
            });
    
            if (completeSignin.status !== 'complete') {
                // check docs
                // Please see https://clerk.com/docs/references/react/use-sign-in#result-status for  more information
            }
            else if (completeSignin.status === "complete") {
                console.log("sign in complete!");
                await setActive({ session: signIn.createdSessionId });
            }
        } catch (err: any) {
            // This can return an array of errors.
            // See https://clerk.com/docs/custom-flows/error-handling to learn about error handling
            console.error(JSON.stringify(err, null, 2));
            if(err.errors[0].meta.paramName == "password") {
                signInForm.setError("password", { message: err.errors[0].message })
            }
            else if(err.errors[0].meta.paramName == "identifier") {
                signInForm.setError("email", { message: err.errors[0].message })
            }
        }
        setLoading(false)

    }

    return (
    <div className='flex flex-col place-items-center'>
        <SignedOut>
        <h1 className='text-2xl mt-4'>Sign in to glassyPDM</h1>
        <h2 className='text-xl mt-2 mb-4'>{data.name}</h2>
        <Form {...signInForm}>
        <form onSubmit={signInForm.handleSubmit(onSigninSubmit)}>
            <FormField
                control={signInForm.control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                        <Input {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
                control={signInForm.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                        <Input {...field} type='password'/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <Button type="submit" className='my-2' disabled={loading}>{loading ? <Loader2 className='w-4 h-4 animate-spin'/> : "Submit"}</Button>
        </form>
        </Form>
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={'outline'} className='mt-2'>Forgot Password?</Button>
            </DialogTrigger>
            <ForgotPassword />
        </Dialog>
        <Separator className='my-4 max-w-md'/>
        <p className='mb-2'>Or</p>
        <Button variant={"outline"} asChild>
            <Link to='/signup'>
            Create an Account
            </Link>
        </Button>
        </SignedOut>
        <SignedIn>
            <Navigate to='/dashboard'/>
        </SignedIn>
    </div>
  )
}

export default SignIn