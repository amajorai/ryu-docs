"use client";

import { installHorizontalWheelScrolling } from "@ryu/ui/lib/horizontal-wheel-scroll";
import { useEffect } from "react";

export function HorizontalWheelScroll() {
	useEffect(() => installHorizontalWheelScrolling(), []);
	return null;
}
