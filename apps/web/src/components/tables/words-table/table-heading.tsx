import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  Files,
  NotebookText,
  Plus,
  RefreshCcw,
  Trash,
} from "lucide-react";

export function TableHeading() {
  return (
    <div className="flex items-center gap-3">
      <div>
        <Button variant="outline" className="bg-white h-[44px]">
          <Plus />
          Adicionar
        </Button>
      </div>
      <div>
        <Button variant="outline" className="bg-white h-[44px]">
          <Trash />
          Remover
        </Button>
      </div>
      <div>
        <Button variant="outline" className="bg-white h-[44px]">
          <Check />
          Conformidades
        </Button>
      </div>
      <div>
        <Button variant="outline" className="bg-white h-[44px]">
          <Files />
          Arquivos
        </Button>
      </div>
      <div>
        <Button variant="outline" className="bg-white h-[44px]">
          <RefreshCcw />
          Atualizar
        </Button>
      </div>
      <Select>
        <SelectTrigger className="w-[180px] !h-[44px]">
          <SelectValue placeholder="Outros" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="system">System</SelectItem>
        </SelectContent>
      </Select>
      <Select>
        <SelectTrigger className="w-[180px] !h-[44px]">
          <SelectValue placeholder="Computador" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="system">System</SelectItem>
        </SelectContent>
      </Select>
      <div className="w-full">
        <Input
          placeholder="Pesquisar por ativo"
          className="rounded-full h-[44px] w-full"
        />
      </div>
      <div>
        <Button variant="outline" className="h-[44px]  bg-white">
          <NotebookText />
          Doc
        </Button>
      </div>
    </div>
  );
}
