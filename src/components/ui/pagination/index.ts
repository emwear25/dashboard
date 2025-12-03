import { h } from "vue";
import type { SetupContext, Slots } from "vue";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-vue-next";

interface PaginationProps {
  isActive?: boolean;
  disabled?: boolean;
}

const Pagination = {
  name: "Pagination",
  setup(_: unknown, { slots }: { slots: Slots }) {
    return () => h("nav", { role: "navigation", "aria-label": "pagination" }, slots.default?.());
  },
};

const PaginationContent = {
  name: "PaginationContent",
  setup(_: unknown, { slots }: { slots: Slots }) {
    return () => h("ul", { class: "flex flex-row items-center gap-1" }, slots.default?.());
  },
};

const PaginationItem = {
  name: "PaginationItem",
  setup(_: unknown, { slots }: { slots: Slots }) {
    return () => h("li", slots.default?.());
  },
};

const PaginationLink = {
  name: "PaginationLink",
  props: {
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  setup(props: PaginationProps, { slots, emit }: SetupContext) {
    return () =>
      h(
        Button,
        {
          class: cn(
            props.isActive
              ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              : "hover:bg-accent hover:text-accent-foreground"
          ),
          variant: "ghost",
          onClick: () => emit("click"),
        },
        slots.default?.()
      );
  },
};

const PaginationPrevious = {
  name: "PaginationPrevious",
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props: PaginationProps, { emit }: SetupContext) {
    return () =>
      h(
        Button,
        {
          class: "gap-1 pl-2.5",
          variant: "ghost",
          disabled: props.disabled,
          onClick: () => emit("click"),
        },
        {
          default: () => [h(ChevronLeft, { class: "h-4 w-4" }), "Previous"],
        }
      );
  },
};

const PaginationNext = {
  name: "PaginationNext",
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props: PaginationProps, { emit }: SetupContext) {
    return () =>
      h(
        Button,
        {
          class: "gap-1 pr-2.5",
          variant: "ghost",
          disabled: props.disabled,
          onClick: () => emit("click"),
        },
        {
          default: () => ["Next", h(ChevronRight, { class: "h-4 w-4" })],
        }
      );
  },
};

const PaginationEllipsis = {
  name: "PaginationEllipsis",
  setup() {
    return () =>
      h(
        "span",
        { class: "flex h-9 w-9 items-center justify-center" },
        h(MoreHorizontal, { class: "h-4 w-4" })
      );
  },
};

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
