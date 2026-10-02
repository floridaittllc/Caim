// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "CAImKeyboardCore",
    products: [
        .library(name: "CAImKeyboardCore", targets: ["CAImKeyboardCore"]),
    ],
    targets: [
        .target(name: "CAImKeyboardCore"),
        .testTarget(
            name: "CAImKeyboardCoreTests",
            dependencies: ["CAImKeyboardCore"]
        ),
    ]
)
