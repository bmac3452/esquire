import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5434/esquire'
  })
});

const caseLaws = [
  {
    caseName: "Miranda v. Arizona",
    citation: "384 U.S. 436",
    year: 1966,
    court: "U.S. Supreme Court",
    jurisdiction: "Federal",
    category: "Constitutional - 5th Amendment",
    summary: "Suspects must be informed of their rights before custodial interrogation. Failure to provide Miranda warnings makes statements inadmissible.",
    relevantText: "The person in custody must, prior to interrogation, be clearly informed that he has the right to remain silent, and that anything he says will be used against him in court; he must be clearly informed that he has the right to consult with a lawyer and to have the lawyer with him during interrogation.",
    keywords: ["miranda rights", "custodial interrogation", "right to remain silent", "right to counsel", "inadmissible statements", "5th amendment", "self-incrimination"]
  },
  {
    caseName: "Mapp v. Ohio",
    citation: "367 U.S. 643",
    year: 1961,
    court: "U.S. Supreme Court",
    jurisdiction: "Federal",
    category: "Constitutional - 4th Amendment",
    summary: "Evidence obtained through illegal searches and seizures is inadmissible in state courts (exclusionary rule).",
    relevantText: "All evidence obtained by searches and seizures in violation of the Constitution is, by that same authority, inadmissible in a state court.",
    keywords: ["exclusionary rule", "illegal search", "4th amendment", "inadmissible evidence", "search and seizure", "warrant"]
  },
  {
    caseName: "Terry v. Ohio",
    citation: "392 U.S. 1",
    year: 1968,
    court: "U.S. Supreme Court",
    jurisdiction: "Federal",
    category: "Constitutional - 4th Amendment",
    summary: "Police may conduct a limited search (frisk) without a warrant if they have reasonable suspicion that a person is armed and dangerous.",
    relevantText: "Where a police officer observes unusual conduct which leads him reasonably to conclude that criminal activity may be afoot and that the persons may be armed and dangerous, he is entitled for the protection of himself and others to conduct a limited search of outer clothing.",
    keywords: ["terry stop", "stop and frisk", "reasonable suspicion", "warrantless search", "4th amendment", "officer safety"]
  },
  {
    caseName: "Brady v. Maryland",
    citation: "373 U.S. 83",
    year: 1963,
    court: "U.S. Supreme Court",
    jurisdiction: "Federal",
    category: "Constitutional - Due Process",
    summary: "Prosecution must disclose material exculpatory evidence to the defense. Suppression of such evidence violates due process.",
    relevantText: "The suppression by the prosecution of evidence favorable to an accused upon request violates due process where the evidence is material either to guilt or to punishment.",
    keywords: ["brady violation", "exculpatory evidence", "prosecutorial misconduct", "due process", "discovery", "favorable evidence"]
  },
  {
    caseName: "Gideon v. Wainwright",
    citation: "372 U.S. 335",
    year: 1963,
    court: "U.S. Supreme Court",
    jurisdiction: "Federal",
    category: "Constitutional - 6th Amendment",
    summary: "Defendants in criminal cases have the right to an attorney, even if they cannot afford one.",
    relevantText: "In our adversary system of criminal justice, any person haled into court, who is too poor to hire a lawyer, cannot be assured a fair trial unless counsel is provided for him.",
    keywords: ["right to counsel", "6th amendment", "indigent defense", "public defender", "fair trial"]
  },
  {
    caseName: "Illinois v. Gates",
    citation: "462 U.S. 213",
    year: 1983,
    court: "U.S. Supreme Court",
    jurisdiction: "Federal",
    category: "Constitutional - 4th Amendment",
    summary: "Establishes the 'totality of circumstances' test for determining probable cause for search warrants.",
    relevantText: "The task of the issuing magistrate is simply to make a practical, common-sense decision whether, given all the circumstances, there is a fair probability that contraband or evidence of a crime will be found in a particular place.",
    keywords: ["probable cause", "search warrant", "totality of circumstances", "informant", "warrant defect"]
  },
  {
    caseName: "Tennessee v. Garner",
    citation: "471 U.S. 1",
    year: 1985,
    court: "U.S. Supreme Court",
    jurisdiction: "Federal",
    category: "Constitutional - 4th Amendment",
    summary: "Police cannot use deadly force to stop a fleeing suspect unless the officer has probable cause to believe the suspect poses a significant threat of death or serious physical injury.",
    relevantText: "The use of deadly force to prevent the escape of all felony suspects, whatever the circumstances, is constitutionally unreasonable.",
    keywords: ["deadly force", "fleeing suspect", "excessive force", "4th amendment", "police shooting", "use of force"]
  },
  {
    caseName: "Batson v. Kentucky",
    citation: "476 U.S. 79",
    year: 1986,
    court: "U.S. Supreme Court",
    jurisdiction: "Federal",
    category: "Constitutional - Equal Protection",
    summary: "Prosecutors cannot use peremptory challenges to exclude jurors solely based on race.",
    relevantText: "The Equal Protection Clause forbids the prosecutor to challenge potential jurors solely on account of their race or on the assumption that black jurors as a group will be unable to impartially consider the State's case.",
    keywords: ["jury selection", "peremptory challenge", "racial discrimination", "equal protection", "14th amendment"]
  },
  {
    caseName: "Berghuis v. Thompkins",
    citation: "560 U.S. 370",
    year: 2010,
    court: "U.S. Supreme Court",
    jurisdiction: "Federal",
    category: "Constitutional - 5th Amendment",
    summary: "Suspect must explicitly invoke Miranda rights; silence alone is not enough to stop interrogation.",
    relevantText: "A suspect who has received and understood the Miranda warnings, and has not invoked his Miranda rights, waives the right to remain silent by making an uncoerced statement to the police.",
    keywords: ["miranda waiver", "invocation of rights", "ambiguous invocation", "right to remain silent", "interrogation"]
  },
  {
    caseName: "Katz v. United States",
    citation: "389 U.S. 347",
    year: 1967,
    court: "U.S. Supreme Court",
    jurisdiction: "Federal",
    category: "Constitutional - 4th Amendment",
    summary: "The Fourth Amendment protects people's reasonable expectation of privacy, not just physical spaces.",
    relevantText: "The Fourth Amendment protects people, not places. What a person knowingly exposes to the public is not subject to Fourth Amendment protection, but what he seeks to preserve as private, even in an area accessible to the public, may be constitutionally protected.",
    keywords: ["expectation of privacy", "warrantless surveillance", "wiretap", "4th amendment", "privacy rights"]
  }
];

async function main() {
  console.log('Seeding case law database...');
  
  for (const caseLaw of caseLaws) {
    await prisma.caseLaw.upsert({
      where: { citation: caseLaw.citation },
      update: caseLaw,
      create: caseLaw
    });
  }
  
  console.log(`✅ Seeded ${caseLaws.length} case laws`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
