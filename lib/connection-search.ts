import type { Intro } from "./data";

/** Search only the conversation data already authorized for this account. */
export function connectionMatches(connection: Intro, query: string) {
  const terms = query.trim().normalize("NFKC").toLocaleLowerCase().slice(0,100).split(/\s+/).filter(Boolean);
  const text = [connection.targetName,connection.sourceName,connection.senderName,connection.message,connection.nextStep?.note,...connection.messages.map(message=>message.body)].join(" ").normalize("NFKC").toLocaleLowerCase();
  return terms.every(term=>text.includes(term));
}
