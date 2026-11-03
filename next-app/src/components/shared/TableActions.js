"use client";

import * as React from "react";
import { MoreHorizontalIcon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

function textContent(children) {
  return React.Children.toArray(children).map((child) => typeof child === "string" || typeof child === "number" ? String(child) : React.isValidElement(child) ? textContent(child.props.children) : "").join("").trim();
}
function menuItems(children) {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) return [];
    if (child.type === DropdownMenuItem) return [{ original: child, label: child.props["aria-label"] || textContent(child.props.children), menuItem: true }];
    if (child.type === DropdownMenuTrigger) return [];
    return menuItems(child.props.children);
  });
}
function controls(children, inheritedLabel) {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) return [];
    if (child.type === DropdownMenu) return menuItems(child.props.children);
    if (child.type === Tooltip) {
      const content = React.Children.toArray(child.props.children).find((item) => React.isValidElement(item) && item.type === TooltipContent);
      return controls(child.props.children, textContent(content?.props.children) || inheritedLabel);
    }
    if (child.type === "button" || child.type === "a" || child.type === Button) return [{ original: child, label: child.props["aria-label"] || inheritedLabel || child.props.title || textContent(child.props.children) || "Row action" }];
    return controls(child.props.children, inheritedLabel);
  });
}
export function TableActions({ children, actions, label = "Row actions" }) {
  const items = actions ? actions.filter(Boolean).map(({ label: name, icon: Icon, ...props }) => ({ label: name, original: <button type="button" {...props}>{Icon && <Icon size={16} aria-hidden="true" />}</button> })) : controls(children);
  if (!items.length) return children;
  const stop = (event) => event.stopPropagation();
  if (items.length === 1) {
    const item = items[0];
    const control = item.menuItem ? <button type="button" disabled={item.original.props.disabled} onClick={item.original.props.onClick}>{React.Children.toArray(item.original.props.children).filter((child) => React.isValidElement(child) && !textContent(child.props.children))}</button> : item.original;
    return <div className="table-actions flex items-center justify-center" onClick={stop}><Tooltip><TooltipTrigger asChild>{React.cloneElement(control, { "aria-label": item.label, className: "table-action-button" })}</TooltipTrigger><TooltipContent>{item.label}</TooltipContent></Tooltip></div>;
  }
  return <div className="table-actions flex items-center justify-center" onClick={stop}><DropdownMenu>
    <Tooltip><TooltipTrigger asChild><DropdownMenuTrigger className="table-action-button" aria-label={label}><MoreHorizontalIcon size={16} aria-hidden="true" /></DropdownMenuTrigger></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>
    <DropdownMenuContent align="end" onClick={stop}>
      {items.map((item, index) => {
        if (item.menuItem) return React.cloneElement(item.original, { key: index });
        const icons = React.Children.toArray(item.original.props.children).filter((child) => React.isValidElement(child) && !textContent(child.props.children));
        return <DropdownMenuItem
          key={index}
          nativeButton={item.original.type !== "a"}
          disabled={item.original.props.disabled}
          variant={/delete|remove/i.test(item.label) ? "destructive" : "default"}
          render={React.cloneElement(item.original, { className: undefined, title: undefined, "aria-label": item.label }, <>{icons}<span>{item.label}</span></>)}
        />;
      })}
    </DropdownMenuContent>
  </DropdownMenu></div>;
}
