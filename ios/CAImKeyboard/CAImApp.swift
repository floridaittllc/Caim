// CAImApp.swift
// Entry point for the host / container application. Its job is to explain how
// to enable the CAIm keyboard and to provide a sandbox where the user can try
// typing (and see GrammarKit running in-process, independent of the keyboard
// extension).

import SwiftUI

@main
struct CAImApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
