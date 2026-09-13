// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "GrammarKit",
    products: [
        .library(name: "GrammarKit", targets: ["GrammarKit"]),
        .executable(name: "grammar-demo", targets: ["grammar-demo"]),
    ],
    targets: [
        .target(
            name: "GrammarKit",
            path: "Sources/GrammarKit"
        ),
        .executableTarget(
            name: "grammar-demo",
            dependencies: ["GrammarKit"],
            path: "Sources/grammar-demo"
        ),
        .testTarget(
            name: "GrammarKitTests",
            dependencies: ["GrammarKit"],
            path: "Tests/GrammarKitTests"
        ),
    ]
)
