"use client";

import { useState } from "react";
import { Paperclip } from "lucide-react";
import { Select } from "@/components/ui/select";
import { SelectMenu } from "@/components/ui/select-menu";
import { Label } from "@/components/ui/label";
import { CHAMADO_TIPO_LABEL } from "@/types";

const FORMATOS = ["Imagem", "Vídeo", "GIF"];
const SUBTIPO_IMAGEM = [
  "Lâmina de oferta",
  "Lâmina de Condição",
  "Feed",
  "Stories",
  "Banner",
];
const SUBTIPO_VIDEO = ["Feed", "Stories", "Youtube", "Tik Tok"];
const MATERIAL_GRAFICO = ["Flyer", "Banner", "Brindes", "Outros"];

const OBS_BRINDES =
  "OBS.: Para solicitar kits de brindes, pedimos que nos especifique o número de unidades necessárias e que solicite a aquisição do material junto ao setor Financeiro. Após aprovada, o e-mail referente à aprovação deve ser encaminhado ao setor de Marketing junto com o endereço de envio, para que tudo seja separado conforme disponibilidade.";

/**
 * Campo Tipo com fluxos condicionais:
 * - Criação de peça -> Formato (Imagem/Vídeo/GIF) -> subtipo -> arquivo de referência
 * - Material gráfico -> opções + observação de brindes
 */
export function CamposPecaChamado() {
  const [tipo, setTipo] = useState("");
  const [formato, setFormato] = useState("");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo *</Label>
        <Select
          id="tipo"
          name="tipo"
          required
          defaultValue=""
          onChange={(e) => {
            setTipo(e.target.value);
            setFormato("");
          }}
        >
          <option value="" disabled>
            Selecione o tipo
          </option>
          {Object.entries(CHAMADO_TIPO_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      {/* Criação de peça */}
      {tipo === "criacao_peca" ? (
        <div className="space-y-4 rounded-lg border border-dashed p-4">
          <div className="space-y-2">
            <Label>Formato *</Label>
            <SelectMenu
              name="formato"
              options={FORMATOS}
              placeholder="Selecione o formato"
              required
              onValueChange={setFormato}
            />
          </div>

          {formato === "Imagem" ? (
            <div className="space-y-2">
              <Label>Tipo de peça *</Label>
              <SelectMenu
                name="subtipo"
                options={SUBTIPO_IMAGEM}
                placeholder="Selecione o tipo de peça"
                required
              />
            </div>
          ) : null}

          {formato === "Vídeo" ? (
            <div className="space-y-2">
              <Label>Tipo de peça *</Label>
              <SelectMenu
                name="subtipo"
                options={SUBTIPO_VIDEO}
                placeholder="Selecione o tipo de peça"
                required
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="referencia" className="flex items-center gap-1.5">
              <Paperclip className="size-4" /> Arquivo de referência
            </Label>
            <input
              id="referencia"
              name="referencia"
              type="file"
              className="block w-full cursor-pointer rounded-md border border-input bg-background text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/70"
            />
            <p className="text-xs text-muted-foreground">
              Opcional. Envie uma imagem, vídeo ou documento de referência (até
              30 MB). Para arquivos maiores, cole um link na descrição.
            </p>
          </div>
        </div>
      ) : null}

      {/* Material gráfico */}
      {tipo === "material_grafico" ? (
        <div className="space-y-3 rounded-lg border border-dashed p-4">
          <div className="space-y-2">
            <Label>Material gráfico *</Label>
            <SelectMenu
              name="material_grafico"
              options={MATERIAL_GRAFICO}
              placeholder="Selecione o material"
              required
            />
          </div>
          <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
            {OBS_BRINDES}
          </p>
        </div>
      ) : null}
    </div>
  );
}
