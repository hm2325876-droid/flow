module.exports=async context=>{
  const path=require('node:path');
  const {flipFuses,FuseVersion,FuseV1Options:O}=await import('@electron/fuses');
  await flipFuses(path.join(context.appOutDir,'FlowProof AI.exe'),{version:FuseVersion.V1,[O.RunAsNode]:false,[O.EnableNodeOptionsEnvironmentVariable]:false,[O.EnableNodeCliInspectArguments]:false,[O.OnlyLoadAppFromAsar]:true,[O.GrantFileProtocolExtraPrivileges]:false});
};
