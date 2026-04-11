# NS Matrix Architecture Diagram

Mermaid Live:

<https://mermaid.live/edit#pako:eNqVV+9u2zYQf5UDCxQdKkdx0qytuwbwHLfzkLZe0qTDrKE4SWeZNSVqJBU7K/q9wL7u2x5ge4MBfZ51e42BpPxHclas/mLiyPvx+LvfHam3DCsjz6+LhPWMqihgOakcecp67G3EzIxyilgvYilNsRImYu9YwBKZEuuxqZCLZIbKwOlZVAAAVJrUJGIf3//28fdf/vrwAUK4HEAI//z6x9/v/4zYj35ZrOTCr/zajyCEZzLmguAVxW7ZBg86neOVx8quqzhTWM7gyXASMZ2jMp032FlQDE+ULAwVKdy5rAgO4S5cckNfrPe2vxIz0pOIfSNzslujmpOBEMZKplViR+cy4SgghP4ITjGGEAZKLtJpVaS8yBpgWPJJxPpLLjX0xyMYCE6F+SpW4fHl6OXwdX88en1xdvo4xJI3HIVMUEwidmr/IaVcQooGIfQz50YqzMgBTVGIGJM5lD5CDbfhp0oahASTGW0xtj6eo81u2TbvwRptr3Ps9/KLqEhXMDXfDsT57TA/PHlquR+mmaXwrCoMz6lxPkozmkTsecaLJUjl8gApXdlDLK/duSwnYNOLyZyKtHe4v3+0xtgKxy3rHDvInUi+bmsg1KSuSMGd4bJUpDXchbHiOsemCrAyM5u5yswghAsvw1coBJnGutzJYxKxWif98Ui76O02PCENIUwJTaUohRAUXXFa6AaEVCkpq7gXbrCBSGaUzGVlJadLwU29EkLgxRUVRqprO0XGCMqpaAamnUgnEavVukYtpTYWQ/C5iy6RuXVuxoROtqONlxdUCMkMbTxlFQuuZy0fgbFzs0UxVvINJVuElN6gYXB2cdJw/JmUTAQuJhH7gZQcCFzAUzS0QC8EzKiwm6YKFw3HqhQS00nELtxgs1foZyAEGbsotK+Xm+RjZeProTKzlslnt2X0WWgZPd1tRL5jEBi3bKvTt8z+BDt6Pum/7E8idmJ7wW0YFVOFze4ltcmUa2BjPzz/7tRx4lUOOplR3vRRlHLrcGb/vfJs44C7oNAQCJ7zprY8qWverYrOD22v5MXoRbONUYbJte1jbgDfnr94DppcLeQ8U2i4LG4salt4rsHUB/Jmn5AbJurS2J3wiblhAvmNRoHxp/d1bO1gb1lXCW3ba006CTkCvdlTZFtvLKXRRmG5JodcF96E0hJDfzT8fjjwlTpcUlI12LS/lKjURHMrGaLynGjuS7g/Hu3UIBUZL2i7Cusm1ljJc8woo2ISsZEdQkYF+UTurN9OqKd7FVDDuNn8BgY/ObkKpgG3qtoWW0/740nEBpVStp0oQsHNNRgJtCwF8sIOLweNsyb2XrdOW/e7u/J8lXgocQ0zVKl996TQH108H7n7utmpssTCyDyvCrtrIkUK2qDybwHbuICWXBuIKwOJe6UY4Bp0iUpTK6e5pOLKpTSXoLie+3dA/bjpyEJcg6oKeLy+POHe/j3gubvx/qPi1i+A+lg2vFqAjoam5PcgrjQv7AWaYelWVVnSeh/s+YdLbhuPSWZuVR39atdEoNYnNIVEKoIpF6J3a3/avX+AgTZKzql368t9PJpikEghVe/W1P3qyc6Cp2bW6+4dlMtHLUBue2ON2O12HxzcXyMe3ksPHz78bETLdA14EHexuwlxGt/vPjj6bEDb7AdCr4KcHjw83ASZxOkRdf8P5haqz2KAJQ9sBw18KQS+OwY+eQHywPW5YFVKQd2abA4eNdDqzhO4Nhb4thX4jhWsSjnYVGiwqkfPfgPLiSiosiSoJRC416VjtbHQvuuDWkOBuw9rnh5FBQtYiQWtvkco5UaqZ/6Lw314BEzJKpux3hSFpoBVZYqGTjhmCnPv9u5f1rYqbw==>

```mermaid
flowchart LR
    user["创始人 / VC / 用户"]
    browser["Browser / Mobile Web"]

    user --> browser

    subgraph FE["smart-ja-web Frontend (Vue 3 + Vite)"]
        pages["Home / Market / Product / Social / AI Lab / Crowdfunding"]
        api["Axios API Client<br/>VITE_API_URL=/api"]
        local["Local demo data / localStorage<br/>fallback products & quota cache"]

        pages --> api
        pages -. fallback .-> local
    end

    browser --> pages

    subgraph EDGE["Edge / Runtime"]
        edge["Nginx or Vite dev proxy<br/>/api -> backend:3005"]
    end

    api --> edge

    subgraph BE["smart-ja-web/server (Express + Prisma)"]
        auth["Auth / User / Wallet"]
        market["Market APIs<br/>services / featured / reviews"]
        orders["Orders APIs<br/>checkout / split orders / inventory / settlement"]
        social["Social APIs<br/>posts / likes / comments"]
        ai["AI APIs<br/>quota / chat / publish"]
        ailab["AILab Project APIs<br/>projects CRUD"]
        zeroclaw["ZeroClaw Gateway<br/>agent / draw"]
        upload["Upload APIs<br/>/upload / object storage"]
    end

    edge --> auth
    edge --> market
    edge --> orders
    edge --> social
    edge --> ai
    edge --> ailab
    edge --> zeroclaw
    edge --> upload

    subgraph DATA["Data & Infra"]
        postgres["PostgreSQL<br/>Prisma schema"]
        redis["Redis<br/>cache + rate limit"]
        object["Uploads / S3 / MinIO"]
        legacy["Legacy JSON seed / migration"]
    end

    auth --> postgres
    market --> postgres
    orders --> postgres
    social --> postgres
    ai --> postgres
    ailab --> postgres
    market --> redis
    social --> redis
    zeroclaw --> redis
    upload --> object
    legacy -. bootstrap / migrate .-> postgres

    subgraph AIEXEC["AI Execution"]
        deepseek["DeepSeek chat API"]
        zeroengine["ZeroClaw service"]
        imagegen["Image generation service"]
    end

    ai --> deepseek
    ai --> zeroengine
    zeroclaw --> zeroengine
    zeroclaw --> imagegen
    ai --> market

    subgraph GAP["Current reality to explain to VC"]
        crowd["Crowdfunding page<br/>currently hardcoded AIUNI demo"]
        ugc["Community cold start<br/>APIs exist but content is sparse"]
        demoenv["Demo risk<br/>frontend-only run => backend 404 impression"]
    end

    pages -. current state .-> crowd
    social -. business gap .-> ugc
    browser -. demo mismatch .-> demoenv

    classDef core fill:#0f172a,stroke:#60a5fa,color:#ffffff,stroke-width:1.2px;
    classDef infra fill:#111827,stroke:#34d399,color:#ffffff,stroke-width:1.2px;
    classDef risk fill:#2b1a1a,stroke:#fb7185,color:#ffffff,stroke-width:1.2px;
    classDef edgeCls fill:#1f2937,stroke:#cbd5e1,color:#ffffff,stroke-width:1.2px;

    class pages,api,auth,market,orders,social,ai,ailab,zeroclaw,upload core;
    class postgres,redis,object,legacy,deepseek,zeroengine,imagegen infra;
    class crowd,ugc,demoenv,local risk;
    class user,browser,edge edgeCls;
```
