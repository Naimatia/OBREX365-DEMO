import React, { Suspense, useMemo } from 'react';
import { connect } from 'react-redux';
import { useLocation } from 'react-router-dom';
import SideNav from 'components/layout-components/SideNav';
import TopNav from 'components/layout-components/TopNav';
import Loading from 'components/shared-components/Loading';
import MobileNav from 'components/layout-components/MobileNav'
import HeaderNav from 'components/layout-components/HeaderNav';
import PageHeader from 'components/layout-components/PageHeader';
import Footer from 'components/layout-components/Footer';
import { Layout, Grid } from 'antd';
import { getNavigation } from 'configs/RoleBasedNavigationConfig';
import { TEMPLATE, MEDIA_QUERIES } from 'constants/ThemeConstant';
import styled from '@emotion/styled';
import utils from 'utils';
import { UserRoles } from 'models/UserModel';

const { Content } = Layout;
const { useBreakpoint } = Grid;

// Define the props interface for the styled component
/**
 * @typedef {Object} AppContentProps
 * @property {boolean} isNavTop - Whether the navigation is at the top
 */

/**
 * Styled component for the app content
 * @type {import('@emotion/styled').StyledComponent<{isNavTop?: boolean}, {}>}
 */
const AppContent = styled('div')(props => ({
    padding: `${TEMPLATE.LAYOUT_CONTENT_GUTTER}px`,
    marginTop: `${TEMPLATE.HEADER_HEIGHT}px`,
    minHeight: `calc(100vh - ${TEMPLATE.CONTENT_HEIGHT_OFFSET}px)`,
    position: 'relative',
    ...(props.isNavTop && {
        maxWidth: `${TEMPLATE.CONTENT_MAX_WIDTH}px`,
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%',
        [`@media ${MEDIA_QUERIES.DESKTOP}`]: {
            marginTop: `${TEMPLATE.HEADER_HEIGHT + TEMPLATE.TOP_NAV_HEIGHT}px`,
            minHeight: `calc(100vh - ${TEMPLATE.CONTENT_HEIGHT_OFFSET}px - ${TEMPLATE.TOP_NAV_HEIGHT}px)`
        }
    }),
    [`@media ${MEDIA_QUERIES.MOBILE}`]: {
        padding: `${TEMPLATE.LAYOUT_CONTENT_GUTTER_SM}px`
    }
}))

export const AppLayout = ({ navCollapsed, navType, direction, children, user }) => {

    const location = useLocation();
    
    // Get role-based navigation based on user role
    // Default to seller navigation if no role is specified
    const configToUse = useMemo(() => {
        if (user && user.Role) {
            return getNavigation(user.Role);
        }
        // Default to Seller role navigation if no role found
        return getNavigation(UserRoles.SELLER);
    }, [user]);

    const currentRouteInfo = utils.getRouteInfo(configToUse, location.pathname);
    const screens = utils.getBreakPoint(useBreakpoint());
    const isMobile = screens.length === 0 ? false : !screens.includes('lg');
    const isNavSide = navType === TEMPLATE.NAV_TYPE_SIDE;
    const isNavTop = navType === TEMPLATE.NAV_TYPE_TOP

    const getLayoutGutter = () => {
        if(isNavTop || isMobile) {
            return 0
        }
        return navCollapsed ? TEMPLATE.SIDE_NAV_COLLAPSED_WIDTH : TEMPLATE.SIDE_NAV_WIDTH
    }

    const getLayoutDirectionGutter = () => {
        if(direction === TEMPLATE.DIR_LTR) {
            return {paddingLeft: getLayoutGutter()}
        }  
        if(direction === TEMPLATE.DIR_RTL) {
            return {paddingRight: getLayoutGutter()}
        }
        return {paddingLeft: getLayoutGutter()}
    }

    // Get the current theme from the app state
    const currentTheme = 'light'; // Default theme, in a real app this would come from state
    
    return (
        <Layout>
            <HeaderNav isMobile={isMobile}/>
            {(isNavTop && !isMobile) ? 
                <TopNav navigationConfig={configToUse} />
            : null
            }
            <Layout>
                {(isNavSide && !isMobile) ? 
                    <SideNav 
                        routeInfo={currentRouteInfo} 
                        hideGroupTitle={false}
                        navigationConfig={configToUse}
                    /> : null 
                }
                <Layout style={getLayoutDirectionGutter()}>
                    <AppContent isNavTop={isNavTop}>
                        <PageHeader display={currentRouteInfo?.breadcrumb} title={currentRouteInfo?.title} />
                        <Content className="h-100">
                            <Suspense fallback={<Loading cover="content"/>}>
                                {children}
                            </Suspense>
                        </Content>
                    </AppContent>
                    <Footer />
                </Layout>
            </Layout>
            {isMobile && 
                <MobileNav 
                    routeInfo={currentRouteInfo} 
                    hideGroupTitle={false} 
                />}
        </Layout>
    )
}

const mapStateToProps = ({ theme, auth }) => {
    const { navCollapsed, navType, locale } = theme;
    const { user } = auth;
    return { navCollapsed, navType, locale, user }
};

export default connect(mapStateToProps)(React.memo(AppLayout));