"use client";

import { Comments } from "@fuma-comment/react";
import { useRouter } from "next/navigation";
interface CommentsWithAuthProps {
    pageId: string; // Add a prop to accept the page ID
}

export function CommentsWithAuth({ pageId }: CommentsWithAuthProps) {
    const router = useRouter()
    const handleSignIn = () => {
        router.push('/dashboard')
    }
    return (
        <Comments
            // comments are grouped by page
            page={pageId}
            auth={{
                type: "api",
                // function to sign in
                signIn: handleSignIn,
            }}
        />
    );
}