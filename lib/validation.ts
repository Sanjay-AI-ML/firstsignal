import { z } from "zod";
import { sectors,stages } from "./data";
const required=(max:number)=>z.string().trim().min(2,"Add at least two characters.").max(max);
const optional=(max:number)=>z.string().trim().max(max).default("");
export const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const dateSchema=z.string().refine(validDate,"Choose a valid calendar date.");
export const profileSchema=z.object({kind:z.enum(["startup","investor"]),name:required(60),founder:required(80),city:required(60),sector:z.string().refine(v=>sectors.includes(v),"Choose a sector."),stage:z.string().refine(v=>stages.includes(v),"Choose a stage."),tagline:required(160),problem:optional(1500),solution:optional(1500),experience:optional(1000),validation:optional(1500),evidenceDate:optional(10).refine(v=>v===""||(validDate(v)&&v<=new Date().toISOString().slice(0,10)),"Choose a valid evidence date today or earlier."),uncertainty:optional(1000),nextMilestone:optional(1000),fundingIntentINR:z.number().int().min(0).max(1000000000),budget:optional(1000),productStatus:optional(250),revenueStatus:optional(250),incorporationStatus:optional(250),sectors:z.array(z.string().refine(v=>sectors.includes(v),"Choose a valid sector.")).max(sectors.length).optional(),stages:z.array(z.string().refine(v=>stages.includes(v),"Choose a valid stage.")).max(stages.length).optional(),checkRangeINR:z.tuple([z.number().int().min(1).max(1000000000),z.number().int().min(1).max(1000000000)]).refine(v=>v[0]<=v[1],"The minimum check size must not exceed the maximum.").optional(),requiredEvidence:z.string().trim().max(1500).optional()}).superRefine((p,ctx)=>{if(p.kind==="startup" && p.problem.length<10)ctx.addIssue({code:"custom",path:["problem"],message:"Describe the problem in at least 10 characters."});});
export const actionSchema=z.discriminatedUnion("action",[
z.object({action:z.literal("save"),profileId:required(100),saved:z.boolean()}),
z.object({action:z.literal("profile"),profile:profileSchema,listed:z.boolean(),consent:z.literal(true)}),
z.object({action:z.literal("request"),profileId:required(100),message:z.string().trim().min(20,"Write at least 20 characters about the fit.").max(2000),consent:z.literal(true)}),
z.object({action:z.literal("respond"),id:required(100),status:z.enum(["accepted","declined","withdrawn"])}),
z.object({action:z.literal("message"),id:required(100),body:z.string().trim().min(1).max(2000)}),
z.object({action:z.literal("progress"),profileId:required(100),title:z.string().trim().min(3).max(100),body:z.string().trim().min(20).max(2000),date:dateSchema.refine(v=>v<=new Date().toISOString().slice(0,10),"Progress dates must be today or earlier."),consent:z.literal(true)}),
z.object({action:z.literal("removeProgress"),profileId:required(100),updateId:required(100)}),
z.object({action:z.literal("block"),profileId:required(100),blocked:z.boolean()}),
z.object({action:z.literal("report"),profileId:required(100),reason:z.enum(["misleading","impersonation","harassment","spam","other"]),details:z.string().trim().min(10).max(1500)}),
z.object({action:z.literal("blockConnection"),id:required(100),blocked:z.boolean()}),
z.object({action:z.literal("reportConnection"),id:required(100),reason:z.enum(["misleading","impersonation","harassment","spam","other"]),details:z.string().trim().min(10).max(1500)})
]);
