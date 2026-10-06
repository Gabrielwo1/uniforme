import type { Linha } from './index';

/**
 * Termos que aparecem em vários ecrãs: as 32 cores da paleta, as peças, os
 * lados e os campos do formulário. Colunas: [PT, EN, ES, FR, DE, IT].
 *
 * Vocabulário de roupa desportiva por língua (para manter a coerência ao
 * acrescentar linhas):
 *   camisola  → jersey · camiseta · maillot · Trikot · maglia
 *   calção    → shorts · pantalón corto · short · Shorts · pantaloncini
 *   meião     → socks · medias · chaussettes · Stutzen · calzettoni
 *   gola      → collar · cuello · col · Kragen · colletto
 *   punhos    → cuffs · puños · poignets · Bündchen · polsini
 *   orçamento → quote · presupuesto · devis · Angebot · preventivo
 */
export const COMUM: Linha[] = [
  // ---------------------------------------------------- paleta de cores --
  ['Branco', 'White', 'Blanco', 'Blanc', 'Weiß', 'Bianco'],
  ['Cinza-claro', 'Light gray', 'Gris claro', 'Gris clair', 'Hellgrau', 'Grigio chiaro'],
  ['Cinza', 'Gray', 'Gris', 'Gris', 'Grau', 'Grigio'],
  ['Antracite', 'Anthracite', 'Antracita', 'Anthracite', 'Anthrazit', 'Antracite'],
  ['Preto', 'Black', 'Negro', 'Noir', 'Schwarz', 'Nero'],
  ['Verde-água', 'Turquoise', 'Turquesa', 'Turquoise', 'Türkis', 'Turchese'],
  ['Azul-celeste', 'Sky blue', 'Celeste', 'Bleu ciel', 'Himmelblau', 'Celeste'],
  ['Azul-claro', 'Light blue', 'Azul claro', 'Bleu clair', 'Hellblau', 'Blu chiaro'],
  ['Azul', 'Blue', 'Azul', 'Bleu', 'Blau', 'Blu'],
  ['Azul-royal', 'Royal blue', 'Azul real', 'Bleu roi', 'Königsblau', 'Blu royal'],
  ['Azul-marinho', 'Navy blue', 'Azul marino', 'Bleu marine', 'Marineblau', 'Blu navy'],
  ['Azul-noite', 'Midnight blue', 'Azul noche', 'Bleu nuit', 'Mitternachtsblau', 'Blu notte'],
  ['Amarelo', 'Yellow', 'Amarillo', 'Jaune', 'Gelb', 'Giallo'],
  ['Amarelo-torrado', 'Amber', 'Ámbar', 'Ambre', 'Bernstein', 'Ambra'],
  ['Dourado', 'Gold', 'Dorado', 'Or', 'Gold', 'Oro'],
  ['Mostarda', 'Mustard', 'Mostaza', 'Moutarde', 'Senf', 'Senape'],
  ['Verde-lima', 'Lime green', 'Verde lima', 'Vert citron', 'Limettengrün', 'Verde lime'],
  ['Verde-claro', 'Light green', 'Verde claro', 'Vert clair', 'Hellgrün', 'Verde chiaro'],
  ['Verde', 'Green', 'Verde', 'Vert', 'Grün', 'Verde'],
  ['Verde-escuro', 'Dark green', 'Verde oscuro', 'Vert foncé', 'Dunkelgrün', 'Verde scuro'],
  ['Laranja', 'Orange', 'Naranja', 'Orange', 'Orange', 'Arancione'],
  ['Laranja-vivo', 'Bright orange', 'Naranja vivo', 'Orange vif', 'Leuchtorange', 'Arancione vivo'],
  ['Vermelho KYPZL', 'KYPZL red', 'Rojo KYPZL', 'Rouge KYPZL', 'KYPZL-Rot', 'Rosso KYPZL'],
  ['Vermelho', 'Red', 'Rojo', 'Rouge', 'Rot', 'Rosso'],
  ['Bordô', 'Burgundy', 'Burdeos', 'Bordeaux', 'Bordeaux', 'Bordeaux'],
  ['Castanho', 'Brown', 'Marrón', 'Marron', 'Braun', 'Marrone'],
  ['Rosa-choque', 'Hot pink', 'Rosa fucsia', 'Rose vif', 'Pink', 'Rosa shocking'],
  ['Rosa', 'Pink', 'Rosa', 'Rose', 'Rosa', 'Rosa'],
  ['Magenta', 'Magenta', 'Magenta', 'Magenta', 'Magenta', 'Magenta'],
  ['Roxo', 'Purple', 'Morado', 'Violet', 'Lila', 'Viola'],
  ['Roxo-escuro', 'Dark purple', 'Morado oscuro', 'Violet foncé', 'Dunkellila', 'Viola scuro'],
  ['Violeta-noite', 'Midnight violet', 'Violeta noche', 'Violet nuit', 'Mitternachtsviolett', 'Viola notte'],
  ['Sem cor', 'No color', 'Sin color', 'Sans couleur', 'Keine Farbe', 'Nessun colore'],

  // ------------------------------------------------- peças, lados, tipos --
  ['Camisola', 'Jersey', 'Camiseta', 'Maillot', 'Trikot', 'Maglia'],
  ['Calção', 'Shorts', 'Pantalón corto', 'Short', 'Shorts', 'Pantaloncini'],
  ['Meião', 'Socks', 'Medias', 'Chaussettes', 'Stutzen', 'Calzettoni'],
  ['Frente', 'Front', 'Frente', 'Devant', 'Vorderseite', 'Fronte'],
  ['Verso', 'Back', 'Espalda', 'Dos', 'Rückseite', 'Retro'],
  ['Nome / texto', 'Name / text', 'Nombre / texto', 'Nom / texte', 'Name / Text', 'Nome / testo'],
  ['Número', 'Number', 'Número', 'Numéro', 'Nummer', 'Numero'],
  ['Escudo / logo', 'Crest / logo', 'Escudo / logo', 'Écusson / logo', 'Wappen / Logo', 'Stemma / logo'],
  ['Cores', 'Colors', 'Colores', 'Couleurs', 'Farben', 'Colori'],
  ['Cod.', 'Code', 'Cód.', 'Réf.', 'Nr.', 'Cod.'],

  // ------------------------------------------------- formulário de dados --
  ['Nome', 'Name', 'Nombre', 'Nom', 'Name', 'Nome'],
  ['E-mail', 'Email', 'Correo electrónico', 'E-mail', 'E-Mail', 'E-mail'],
  ['Telefone', 'Phone', 'Teléfono', 'Téléphone', 'Telefon', 'Telefono'],
  ['Clube / Equipa', 'Club / Team', 'Club / Equipo', 'Club / Équipe', 'Verein / Team', 'Club / Squadra'],
  ['Observações', 'Notes', 'Observaciones', 'Remarques', 'Anmerkungen', 'Note'],
  ['Opcional', 'Optional', 'Opcional', 'Facultatif', 'Optional', 'Facoltativo'],
  ['O seu nome', 'Your name', 'Su nombre', 'Votre nom', 'Ihr Name', 'Il tuo nome'],
  ['Quantidades, tamanhos, prazos…', 'Quantities, sizes, lead times…', 'Cantidades, tallas, plazos…', 'Quantités, tailles, délais…', 'Mengen, Größen, Fristen…', 'Quantità, taglie, tempi…'],

  // ---------------------------------------------------- navegação geral --
  ['Menu', 'Menu', 'Menú', 'Menu', 'Menü', 'Menu'],
  ['Orçamento', 'Quote', 'Presupuesto', 'Devis', 'Angebot', 'Preventivo'],
  ['Contacto', 'Contact', 'Contacto', 'Contact', 'Kontakt', 'Contatti'],
  ['Contato', 'Contact', 'Contacto', 'Contact', 'Kontakt', 'Contatti'],
  ['Contactos', 'Contact details', 'Contacto', 'Coordonnées', 'Kontaktdaten', 'Recapiti'],
  ['Personalização', 'Customization', 'Personalización', 'Personnalisation', 'Personalisierung', 'Personalizzazione'],
];
