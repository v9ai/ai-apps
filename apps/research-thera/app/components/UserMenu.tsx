"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Flex, Button } from "@radix-ui/themes";

export default function UserMenu() {
  return (
    <>
      <SignedOut>
        <Flex align="center" gap="4">
          <SignInButton mode="modal">
            <Button variant="ghost" size="2">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button size="2">Sign up</Button>
          </SignUpButton>
        </Flex>
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
              userButtonTrigger: "aria-label-open-user-menu",
            },
          }}
        />
      </SignedIn>
    </>
  );
}
