"use client";

import { Send } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TELEGRAM_BOT_URL } from "@/lib/telegram-bot";
import { cn } from "@/lib/utils";

/**
 * Opens Telegram (app on phones, web/desktop elsewhere). Uses https://t.me/ per Telegram docs.
 */
export function TelegramBotCta() {
	return (
		<a
			href={TELEGRAM_BOT_URL}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				buttonVariants({
					variant: "outline",
					size: "sm",
				}),
				"touch-manipulation gap-2 no-underline",
			)}
		>
			<Send className="size-4 shrink-0" aria-hidden />
			<span className="sm:hidden">Telegram</span>
			<span className="hidden sm:inline">
				Report in Telegram
			</span>
		</a>
	);
}
