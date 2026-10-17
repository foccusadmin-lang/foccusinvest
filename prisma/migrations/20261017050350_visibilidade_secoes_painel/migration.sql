-- AlterTable
ALTER TABLE "ConfiguracaoSistema" ADD COLUMN     "mostrarComparativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mostrarEstrategia" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mostrarEvolucaoRendimentos" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mostrarPerfilOperacao" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mostrarRentabilidadeIndices" BOOLEAN NOT NULL DEFAULT true;
