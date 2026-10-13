import { fireEvent, render, screen } from "@testing-library/react";
import { DeleteVaultSettings } from "../delete-vault-dialog";
import { deleteVault } from "@/actions/actions";

jest.mock("@/actions/actions", () => ({
  deleteVault: jest.fn(async () => undefined),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(async () => undefined),
  }),
}));

describe("DeleteVaultSettings", () => {
  it("só libera a exclusão quando o texto é DELETAR", () => {
    render(<DeleteVaultSettings vaultId={4} vaultName="Vocabulario Teste" />);

    fireEvent.click(screen.getByRole("button", { name: "Deletar vault" }));
    const confirm = screen.getByRole("button", { name: /^Deletar$/ });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Confirmação"), {
      target: { value: "deletar" },
    });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Confirmação"), {
      target: { value: "DELETAR" },
    });
    expect(confirm).toBeEnabled();
  });

  it("chama a exclusão só depois da confirmação", () => {
    render(<DeleteVaultSettings vaultId={4} vaultName="Vocabulario Teste" />);
    fireEvent.click(screen.getByRole("button", { name: "Deletar vault" }));
    fireEvent.change(screen.getByLabelText("Confirmação"), {
      target: { value: "DELETAR" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Deletar$/ }));
    expect(deleteVault).toHaveBeenCalledWith(4);
  });
});
