import { Button } from '@/components/ui/button'
import { Form, FormControl, FormItem, FormLabel, FormField, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator'
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form';
import { z } from "zod";
import { useSignIn } from "@clerk/clerk-react";

export const Route = createFileRoute('/_app/signin')({
    component: SignIn,
})

const signInSchema = z.object({
    email: z.string().email( { message: "Invalid email." }),
    password: z.string().min(6, { message: "Password too short." })
})

function SignIn() {
    const { isLoaded, signIn, setActive } = useSignIn();


    const signInForm = useForm<z.infer<typeof signInSchema>>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: "",
            password: ""
        }
    })

    async function onSigninSubmit(values: z.infer<typeof signInSchema>) {
        if (!isLoaded) {
            // TODO error feedback
            return; // clerk hasn't loaded yet
        }

        // TODO try catch or better error handling
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
                await setActive({ session: completeSignin.createdSessionId });
                // TODO redirect to project view
            }
        } catch (err: any) {
            // This can return an array of errors.
            // See https://clerk.com/docs/custom-flows/error-handling to learn about error handling
            console.error(JSON.stringify(err, null, 2));
        }

    }

    return (
    <div className='flex flex-col place-items-center'>
        <h1 className='text-2xl mb-4'>Sign In</h1>
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
            <Button type="submit" className='mt-2'>Submit</Button>
        </form>
        </Form>
        <Button variant={'outline'} className='mt-2'>Forgot Password?</Button>
        <Separator className='my-4 max-w-md'/>
        <p className=''>Or</p>
        <Button>
        <Link from='/about' to='/signup'>Create an Account</Link>
        </Button>
    </div>
  )
}

export default SignIn