import Footer from "@/components/blocks/footer";
import Header from "@/components/blocks/header";
import { ReactNode } from "react";
import { getLandingPage } from "@/services/page";
import Feedback from "@/components/feedback";

export default async function DefaultLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getLandingPage(locale);

  return (
    <>
      {/* 头部导航栏*/}
      {page.header && <Header header={page.header} />}
      {/* 中间内容页*/}
      <main className="overflow-x-hidden">{children}</main>
      {/* 底部导航栏*/}
      {page.footer && <Footer footer={page.footer} />}
      {/* 悬浮信息按钮*/}
      {/* <Feedback socialLinks={page.footer?.social?.items} /> */}
    </>
  );
}
