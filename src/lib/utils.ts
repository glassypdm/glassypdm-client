import { useAuth } from "@clerk/clerk-react";
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { useQuery } from "@tanstack/react-query"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function useFetch() {
  const { getToken } = useAuth();
  const authenticatedFetch = async (...args: any) => {
    const tok = await getToken();
    return fetch(args, {
      headers: { Authorization: `Bearer ${tok}` }
    }).then(res => res.json());
  };
 
  return authenticatedFetch;
}