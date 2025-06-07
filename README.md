This is a project to share open source ai model, with full functionality such as demo images, 
writing description,login as well as a working comment section. If you are a stable diffusion
or flux creator looking for an alternative way to share model, feel free to utilize this project !

## Getting Started

The env you need, I recommend using cloudflare R2 for storing image and models since 
egress is free. And it benefits from cloudflare's cdn 

```bash
BETTER_AUTH_SECRET=

BETTER_AUTH_URL=
NEXT_PUBLIC_APP_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

DATABASE_URL=
REDIS_URL=

R2_BUCKET_NAME=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_URL=
```

Tech stack: Nextjs + postgres + R2 + better auth + fuma comment + redis + zustand
Note that for database adapter, both prisma and drizzle was utilized, since fuma comment
need drizzle to query the database, so if you made changes, please rememeber to update the
database schema for both orms.

## Support Me 

I would like to contribute more to the gen ai open source community, currently working 
on a new anime diffusion model based on SD3.5m, which requires lots of resouces, if you 
like my work please consider supporting me, thanks !

- [Ko fi](https://ko-fi.com/suzushi2024) 

You can also check out [my huggingface](https://huggingface.co/suzushi) for datasets 

## License

Apache 2.0
