import ExpoModulesCore

public class CaimAppGroupModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CaimAppGroup")

    Function("setSharedValue") { (key: String, value: String) in
      UserDefaults(suiteName: "group.com.caim.keyboard")?.set(value, forKey: key)
    }

    Function("removeSharedValue") { (key: String) in
      UserDefaults(suiteName: "group.com.caim.keyboard")?.removeObject(forKey: key)
    }
  }
}
