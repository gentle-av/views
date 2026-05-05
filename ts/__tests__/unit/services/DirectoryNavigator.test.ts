import { describe, it, expect } from "vitest";
import { DirectoryNavigator } from "../../../services/video/DirectoryNavigator.js";

describe("DirectoryNavigator", () => {
  it("should create with root path", () => {
    const nav = new DirectoryNavigator("/mnt/video");
    expect(nav.getCurrentPathString()).toBe("/mnt/video");
    expect(nav.isRoot()).toBe(true);
  });

  it("should navigate to path", () => {
    const nav = new DirectoryNavigator("/mnt/video");
    nav.navigateTo("/mnt/video/movies");

    expect(nav.getCurrentPathString()).toBe("/mnt/video/movies");
    expect(nav.isRoot()).toBe(false);
  });

  it("should maintain history", () => {
    const nav = new DirectoryNavigator("/mnt/video");
    nav.navigateTo("/mnt/video/movies");
    nav.navigateTo("/mnt/video/movies/action");

    expect(nav.getHistory()).toEqual([
      "/mnt/video",
      "/mnt/video/movies",
      "/mnt/video/movies/action",
    ]);
  });

  it("should go back", () => {
    const nav = new DirectoryNavigator("/mnt/video");
    nav.navigateTo("/mnt/video/movies");
    nav.navigateTo("/mnt/video/movies/action");

    const result = nav.goBack();
    expect(result).toBe(true);
    expect(nav.getCurrentPathString()).toBe("/mnt/video/movies");
  });

  it("should not go back at root", () => {
    const nav = new DirectoryNavigator("/mnt/video");
    const result = nav.goBack();

    expect(result).toBe(false);
    expect(nav.getCurrentPathString()).toBe("/mnt/video");
  });

  it("should check can go back", () => {
    const nav = new DirectoryNavigator("/mnt/video");
    expect(nav.canGoBack()).toBe(false);

    nav.navigateTo("/mnt/video/movies");
    expect(nav.canGoBack()).toBe(true);
  });

  it("should go to root", () => {
    const nav = new DirectoryNavigator("/mnt/video");
    nav.navigateTo("/mnt/video/movies");
    nav.goToRoot();

    expect(nav.getCurrentPathString()).toBe("/mnt/video");
    expect(nav.getHistory()).toEqual(["/mnt/video"]);
  });

  it("should get parent path", () => {
    const nav = new DirectoryNavigator("/mnt/video");
    nav.navigateTo("/mnt/video/movies/action");

    const parent = nav.getParentPath();
    expect(parent?.getValue()).toBe("/mnt/video/movies");
  });

  it("should return null for parent at root", () => {
    const nav = new DirectoryNavigator("/mnt/video");
    const parent = nav.getParentPath();

    expect(parent).toBeNull();
  });

  it("should go to parent", () => {
    const nav = new DirectoryNavigator("/mnt/video");
    nav.navigateTo("/mnt/video/movies/action");

    const result = nav.goToParent();
    expect(result).toBe(true);
    expect(nav.getCurrentPathString()).toBe("/mnt/video/movies");
  });

  it("should not go to parent at root", () => {
    const nav = new DirectoryNavigator("/mnt/video");
    const result = nav.goToParent();

    expect(result).toBe(false);
  });

  it("should reset navigation", () => {
    const nav = new DirectoryNavigator("/mnt/video");
    nav.navigateTo("/mnt/video/movies");
    nav.navigateTo("/mnt/video/movies/action");
    nav.reset();

    expect(nav.getCurrentPathString()).toBe("/mnt/video");
    expect(nav.getHistory()).toEqual(["/mnt/video"]);
  });
});
