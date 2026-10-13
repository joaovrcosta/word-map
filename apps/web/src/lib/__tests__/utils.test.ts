import { cn } from "../utils";

describe("Utils", () => {
  describe("cn", () => {
    it("deve combinar classes CSS corretamente", () => {
      const result = cn("text-red-500", "bg-blue-100", "p-4");
      expect(result).toBe("text-red-500 bg-blue-100 p-4");
    });

    it("deve lidar com classes condicionais", () => {
      const isActive = true;
      const isDisabled = false;

      const result = cn(
        "base-class",
        isActive && "active-class",
        isDisabled && "disabled-class"
      );

      expect(result).toBe("base-class active-class");
    });

    it("deve lidar com arrays de classes", () => {
      const result = cn(["text-lg", "font-bold"], "text-center");
      expect(result).toBe("text-lg font-bold text-center");
    });

    it("deve lidar com objetos de classes condicionais", () => {
      const result = cn({
        "text-red-500": true,
        "text-blue-500": false,
        "font-bold": true,
        italic: false,
      });

      expect(result).toBe("text-red-500 font-bold");
    });

    it("deve mesclar classes conflitantes do Tailwind", () => {
      const result = cn("text-red-500", "text-blue-500");
      expect(result).toBe("text-blue-500"); // A última deve prevalecer
    });

    it("deve lidar com valores undefined e null", () => {
      const result = cn("base-class", undefined, null, "valid-class");
      expect(result).toBe("base-class valid-class");
    });

    it("deve lidar com strings vazias", () => {
      const result = cn("base-class", "", "valid-class");
      expect(result).toBe("base-class valid-class");
    });

    it("deve lidar com entrada vazia", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("deve lidar com entrada única", () => {
      const result = cn("single-class");
      expect(result).toBe("single-class");
    });

    it("deve combinar diferentes tipos de entrada", () => {
      const isActive = true;
      const classes = ["text-lg", "font-semibold"];
      const conditionalClasses = {
        "text-green-500": isActive,
        "text-red-500": !isActive,
      };

      const result = cn(
        "base-class",
        classes,
        conditionalClasses,
        "additional-class"
      );

      expect(result).toBe(
        "base-class text-lg font-semibold text-green-500 additional-class"
      );
    });

    it("deve lidar com classes duplicadas", () => {
      const result = cn("text-lg", "font-bold", "text-lg", "text-xl");
      expect(result).toBe("font-bold text-xl"); // A última versão deve prevalecer
    });

    it("deve lidar com classes complexas do Tailwind", () => {
      const result = cn(
        "bg-gradient-to-r from-blue-500 to-purple-600",
        "hover:from-blue-600 hover:to-purple-700",
        "focus:ring-2 focus:ring-blue-500",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      );

      expect(result).toBe(
        "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      );
    });

    it("deve lidar com classes customizadas", () => {
      const result = cn("custom-class", "another-custom-class");
      expect(result).toBe("custom-class another-custom-class");
    });

    it("deve lidar com classes que começam com números", () => {
      const result = cn("2xl:text-4xl", "3xl:text-5xl");
      expect(result).toBe("2xl:text-4xl 3xl:text-5xl");
    });

    it("deve lidar com classes com caracteres especiais", () => {
      const result = cn("w-1/2", "w-1/3", "h-screen");
      expect(result).toBe("w-1/3 h-screen"); // w-1/3 deve prevalecer sobre w-1/2
    });
  });
});
