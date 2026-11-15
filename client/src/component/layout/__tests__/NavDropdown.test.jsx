import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NavDropdown from "../NavDropdown";

// The header menu sits above every page's content, so its photos were the first
// <img>s in the server HTML — Google used one (the Brake Caliper Lamp) as the GTA 6
// stand's search thumbnail. The photos must only mount once someone opens the menu.
const menu = {
  groups: [{ title: "Lamps", links: [{ to: "/product/lamp", label: "Brake Caliper Lamp", img: "https://cdn.test/caliper.webp" }] }],
  featured: { to: "/product/katana", name: "Anime Wooden Katana", img: "https://cdn.test/katana.webp" },
};
const nav = <MemoryRouter><NavDropdown label="Decor" to="/category/decor" menu={menu} /></MemoryRouter>;

describe("NavDropdown", () => {
  it("server HTML keeps the menu links but no menu photos", () => {
    const html = renderToString(nav);
    expect(html).not.toContain("<img");
    expect(html).toContain('href="/product/lamp"');
    expect(html).toContain("Anime Wooden Katana");
  });

  it("photos appear once the menu is opened", () => {
    const { container } = render(nav);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    fireEvent.mouseEnter(container.querySelector("[aria-haspopup]").parentElement);
    expect(screen.getByRole("link", { name: /Decor/, expanded: true })).toBeTruthy();
    expect([...container.querySelectorAll("img")].map((i) => i.getAttribute("src")))
      .toEqual(["https://cdn.test/caliper.webp", "https://cdn.test/katana.webp"]);
  });
});
