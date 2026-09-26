import {createContext,useContext,type ReactNode} from 'react';
import {CommunityLayout} from './shared';
export const WorkspaceContext=createContext<{refresh:()=>void}|null>(null);
export function AccountFrame({children,title}:{children:ReactNode;title:string}){const workspace=useContext(WorkspaceContext);return workspace?<>{children}</>:<CommunityLayout title={title}>{children}</CommunityLayout>;}
export function AccountTitle({children}:{children:ReactNode}){return useContext(WorkspaceContext)?<h2>{children}</h2>:<h1>{children}</h1>;}
